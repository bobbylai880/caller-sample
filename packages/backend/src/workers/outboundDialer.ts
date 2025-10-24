import { CallAttemptStatus, TaskStatus } from '@prisma/client';
import { Worker } from 'bullmq';

import { env } from '../env.js';
import { connection } from '../lib/bullmq.js';
import { prisma } from '../lib/prisma.js';
import { createOutboundCall } from '../lib/twilio.js';
import type { DialerJobData } from '../queues/dialerQueue.js';
import { scheduleNextAttempt } from '../services/taskService.js';

export const dialerWorker = new Worker<DialerJobData>(
  'tasks:dialer',
  async (job) => {
    const { attemptId } = job.data;

    const attempt = await prisma.callAttempt.findUnique({
      where: { id: attemptId },
      include: { task: true }
    });

    if (!attempt || !attempt.task) {
      return;
    }

    const task = attempt.task;
    if ([TaskStatus.STOPPED, TaskStatus.MATCHED, TaskStatus.COMPLETED].includes(task.status)) {
      return;
    }

    const now = new Date();
    if (task.timeWindowStart && now < task.timeWindowStart) {
      const delay = task.timeWindowStart.getTime() - now.getTime();
      await job.moveToDelayed(Date.now() + delay);
      return;
    }

    if (task.timeWindowEnd && now > task.timeWindowEnd) {
      await scheduleNextAttempt(attempt.id, {
        reason: 'TIME_WINDOW_EXPIRED',
        retriable: false,
        status: CallAttemptStatus.CANCELED
      });
      return;
    }

    await prisma.task.update({
      where: { id: task.id },
      data: { status: TaskStatus.RUNNING, lastAttemptedAt: new Date() }
    });

    await prisma.callAttempt.update({
      where: { id: attempt.id },
      data: { status: CallAttemptStatus.DIALING, startedAt: new Date() }
    });

    const statusCallback = `${env.PUBLIC_BASE_URL}/webhooks/twilio/voice`;
    const answerUrl = `${env.PUBLIC_BASE_URL}/webhooks/twilio/answer?attemptId=${attempt.id}`;

    const call = await createOutboundCall({
      to: attempt.number,
      statusCallback,
      answerUrl
    });

    await prisma.callAttempt.update({
      where: { id: attempt.id },
      data: { callSid: call.sid }
    });
  },
  { connection }
);

dialerWorker.on('failed', async (job, err) => {
  if (!job) return;
  const attemptId = job.data.attemptId;
  await scheduleNextAttempt(attemptId, {
    reason: `WORKER_ERROR:${err.message}`,
    retriable: true,
    status: CallAttemptStatus.FAILED
  });
});
