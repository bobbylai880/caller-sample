import type { Prisma, RuleSet, Task } from '@prisma/client';
import { CallAttemptStatus, TaskStatus } from '@prisma/client';

import { computeBackoffDelayMs, defaultBackoffPolicy, type BackoffPolicy } from '../lib/backoff.js';
import { sendMatchNotification } from '../lib/fcm.js';
import { prisma } from '../lib/prisma.js';
import { hangupCall } from '../lib/twilio.js';
import { dialerQueue } from '../queues/dialerQueue.js';

export type CreateTaskInput = {
  numbers: string[];
  userPhone: string;
  ruleSetId: string;
  timeWindow?: { start?: Date; end?: Date };
  perNumberMaxAttempts?: number;
  globalMaxAttempts?: number;
  backoffPolicy?: Partial<BackoffPolicy>;
};

export const toBackoffPolicy = (policy?: Partial<BackoffPolicy>): BackoffPolicy => ({
  ...defaultBackoffPolicy,
  ...policy
});

export const createTask = async (input: CreateTaskInput) => {
  const perNumberMax = input.perNumberMaxAttempts ?? 3;
  const computedGlobalMax =
    input.globalMaxAttempts ?? perNumberMax * Math.max(1, input.numbers.length);

  const task = await prisma.task.create({
    data: {
      numbers: input.numbers,
      userPhone: input.userPhone,
      ruleSetId: input.ruleSetId,
      perNumberMaxAttempts: perNumberMax,
      globalMaxAttempts: computedGlobalMax,
      timeWindowStart: input.timeWindow?.start,
      timeWindowEnd: input.timeWindow?.end,
      backoffPolicy: toBackoffPolicy(input.backoffPolicy) as Prisma.JsonObject
    }
  });

  const attempt = await prisma.callAttempt.create({
    data: {
      taskId: task.id,
      number: task.numbers[0],
      attemptNumber: 1,
      scheduledFor: input.timeWindow?.start ?? new Date()
    }
  });

  await enqueueAttempt(attempt.id, { task, delayMs: computeInitialDelay(task) });

  return task;
};

const computeInitialDelay = (task: Task) => {
  if (task.timeWindowStart) {
    const diff = task.timeWindowStart.getTime() - Date.now();
    return diff > 0 ? diff : 0;
  }

  return 0;
};

export const enqueueAttempt = async (attemptId: string, options?: { task?: Task; delayMs?: number }) => {
  const jobOptions = {
    removeOnComplete: true,
    removeOnFail: true,
    delay: options?.delayMs ?? 0,
    jobId: attemptId,
    attempts: 1
  } as const;

  const job = await dialerQueue.add('dial-attempt', { attemptId }, jobOptions);

  await prisma.callAttempt.update({
    where: { id: attemptId },
    data: {
      jobId: job.id,
      scheduledFor: options?.delayMs ? new Date(Date.now() + options.delayMs) : new Date(),
      nextRetryAt: options?.delayMs ? new Date(Date.now() + options.delayMs) : null,
      status: CallAttemptStatus.PENDING
    }
  });
};

export const stopTask = async (taskId: string) => {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { status: TaskStatus.STOPPED }
  });

  const pendingAttempts = await prisma.callAttempt.findMany({
    where: {
      taskId,
      status: {
        in: [
          CallAttemptStatus.PENDING,
          CallAttemptStatus.RINGING,
          CallAttemptStatus.DIALING,
          CallAttemptStatus.ANSWERED,
          CallAttemptStatus.MATCHED
        ]
      }
    }
  });

  await Promise.all(
    pendingAttempts.map(async (attempt) => {
      if (attempt.jobId) {
        const job = await dialerQueue.getJob(attempt.jobId);
        await job?.remove();
      }
      if (attempt.callSid) {
        await hangupCall(attempt.callSid).catch((error) => {
          // eslint-disable-next-line no-console
          console.warn('Failed to hang up call', attempt.callSid, error);
        });
      }
      await prisma.callAttempt.update({
        where: { id: attempt.id },
        data: { status: CallAttemptStatus.CANCELED, completedAt: new Date(), reason: 'TASK_STOPPED' }
      });
    })
  );

  return task;
};

export const getTaskWithAttempts = async (taskId: string) => {
  return prisma.task.findUnique({
    where: { id: taskId },
    include: { attempts: { orderBy: { createdAt: 'asc' } }, ruleSet: true }
  });
};

export const markAttemptMatched = async (
  attemptId: string,
  data: { metadata?: Prisma.InputJsonValue; reason?: string }
) => {
  const attempt = await prisma.callAttempt.update({
    where: { id: attemptId },
    data: {
      status: CallAttemptStatus.MATCHED,
      matched: true,
      matchMetadata: data.metadata,
      reason: data.reason,
      completedAt: new Date()
    },
    include: { task: true }
  });

  await prisma.task.update({
    where: { id: attempt.taskId },
    data: {
      status: TaskStatus.MATCHED,
      completedAt: new Date()
    }
  });

  await sendMatchNotification({ taskId: attempt.taskId, number: attempt.number, match: true });

  return attempt;
};

export const scheduleNextAttempt = async (
  attemptId: string,
  options: {
    reason: string;
    sipCode?: number;
    retriable: boolean;
    status?: CallAttemptStatus;
  }
) => {
  const attempt = await prisma.callAttempt.update({
    where: { id: attemptId },
    data: {
      status: options.status ?? (options.retriable ? CallAttemptStatus.FAILED : CallAttemptStatus.COMPLETED),
      reason: options.reason,
      sipCode: options.sipCode,
      completedAt: new Date()
    },
    include: { task: true }
  });

  const task = attempt.task;
  if (!task) {
    throw new Error(`Task relation missing for attempt ${attemptId}`);
  }
  if (task.status === TaskStatus.STOPPED) {
    return { scheduled: false };
  }

  const totalAttempts = await prisma.callAttempt.count({ where: { taskId: task.id } });

  const backoffPolicy = toBackoffPolicy(task.backoffPolicy as BackoffPolicy | undefined);

  const perNumberAttempts = await prisma.callAttempt.count({ where: { taskId: task.id, number: attempt.number } });
  const maxPerNumber = task.perNumberMaxAttempts ?? 3;

  if (options.retriable && perNumberAttempts < maxPerNumber) {
    const nextAttempt = await prisma.callAttempt.create({
      data: {
        taskId: task.id,
        number: attempt.number,
        attemptNumber: perNumberAttempts + 1
      }
    });

    const delayMs = computeBackoffDelayMs(perNumberAttempts + 1, backoffPolicy);
    await enqueueAttempt(nextAttempt.id, { delayMs });

    return { scheduled: true };
  }

  if (task.globalMaxAttempts && totalAttempts >= task.globalMaxAttempts) {
    await prisma.task.update({
      where: { id: task.id },
      data: { status: TaskStatus.FAILED }
    });
    await sendMatchNotification({ taskId: task.id, number: attempt.number, match: false });
    return { scheduled: false };
  }

  const nextNumberIndex = task.numbers.findIndex((n) => n === attempt.number) + 1;
  const nextNumber = task.numbers[nextNumberIndex];

  if (!nextNumber) {
    await prisma.task.update({
      where: { id: task.id },
      data: { status: TaskStatus.FAILED }
    });
    await sendMatchNotification({ taskId: task.id, number: attempt.number, match: false });
    return { scheduled: false };
  }

  const nextAttempt = await prisma.callAttempt.create({
    data: {
      taskId: task.id,
      number: nextNumber,
      attemptNumber: 1
    }
  });

  await enqueueAttempt(nextAttempt.id, { delayMs: computeInitialDelay(task) });
  return { scheduled: true };
};

export const ensureRuleSet = async (ruleSetId: string) => {
  const ruleSet = await prisma.ruleSet.findUnique({ where: { id: ruleSetId } });
  if (!ruleSet) {
    throw new Error(`RuleSet ${ruleSetId} not found`);
  }
  return ruleSet;
};

export const evaluateRuleSet = (ruleSet: RuleSet, event: { answeredBy?: string }) => {
  if (ruleSet.config && typeof ruleSet.config === 'object') {
    const config = ruleSet.config as { answeredBy?: string[] };
    if (config.answeredBy && event.answeredBy) {
      return config.answeredBy.includes(event.answeredBy);
    }
  }

  return event.answeredBy === 'human';
};
