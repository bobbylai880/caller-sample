import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';

import { createTaskSchema } from '../schemas/tasks.js';
import { createTask, ensureRuleSet, getTaskWithAttempts, stopTask } from '../services/taskService.js';

const router = Router();

router.post('/api/tasks', async (req, res) => {
  const parseResult = createTaskSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(StatusCodes.BAD_REQUEST).json({ errors: parseResult.error.flatten() });
  }

  const payload = parseResult.data;

  try {
    const ruleSet = await ensureRuleSet(payload.ruleSetId);
    const timeWindow = payload.timeWindow
      ? {
          start: payload.timeWindow.start ? new Date(payload.timeWindow.start) : undefined,
          end: payload.timeWindow.end ? new Date(payload.timeWindow.end) : undefined
        }
      : undefined;

    const task = await createTask({
      numbers: payload.numbers,
      userPhone: payload.userPhone,
      ruleSetId: ruleSet.id,
      timeWindow,
      perNumberMaxAttempts: payload.perNumberMaxAttempts,
      globalMaxAttempts: payload.globalMaxAttempts,
      backoffPolicy: payload.backoffPolicy ?? undefined
    });

    return res.status(StatusCodes.ACCEPTED).json({ taskId: task.id });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    if (error instanceof Error && error.message.includes('RuleSet')) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: error.message });
    }
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to create task' });
  }
});

router.post('/api/tasks/:id/stop', async (req, res) => {
  const { id } = req.params;

  try {
    await stopTask(id);
    return res.status(StatusCodes.OK).json({ taskId: id, status: 'stopped' });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(StatusCodes.NOT_FOUND).json({ message: 'Task not found' });
  }
});

router.get('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;

  const task = await getTaskWithAttempts(id);
  if (!task) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: 'Task not found' });
  }

  return res.status(StatusCodes.OK).json({
    id: task.id,
    status: task.status,
    numbers: task.numbers,
    userPhone: task.userPhone,
    perNumberMaxAttempts: task.perNumberMaxAttempts,
    globalMaxAttempts: task.globalMaxAttempts,
    timeWindowStart: task.timeWindowStart,
    timeWindowEnd: task.timeWindowEnd,
    backoffPolicy: task.backoffPolicy,
    attempts: task.attempts,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    completedAt: task.completedAt
  });
});

export default router;
