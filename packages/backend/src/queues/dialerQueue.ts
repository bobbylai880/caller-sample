import { Queue } from 'bullmq';

import { env } from '../env.js';
import { connection } from '../lib/bullmq.js';

export type DialerJobData = {
  attemptId: string;
};

type QueueLike = Pick<Queue<DialerJobData>, 'add' | 'getJob'>;

type QueueAddReturn = Awaited<ReturnType<Queue<DialerJobData>['add']>>;

const createStubQueue = (): QueueLike => ({
  add: async () => ({
    id: `stub-${Date.now()}`
  }) as unknown as QueueAddReturn,
  getJob: async () => undefined
});

const isTestEnvironment =
  process.env.SKIP_BULLMQ === '1' ||
  process.env.VITEST_WORKER_ID !== undefined ||
  env.NODE_ENV === 'test';

export const dialerQueue: QueueLike = isTestEnvironment
  ? createStubQueue()
  : new Queue<DialerJobData>('tasks:dialer', {
      connection,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true
      }
    });
