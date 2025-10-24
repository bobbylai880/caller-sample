declare module '@prisma/client' {
  export enum TaskStatus {
    PENDING = 'PENDING',
    RUNNING = 'RUNNING',
    MATCHED = 'MATCHED',
    COMPLETED = 'COMPLETED',
    STOPPED = 'STOPPED',
    FAILED = 'FAILED'
  }

  export enum CallAttemptStatus {
    PENDING = 'PENDING',
    DIALING = 'DIALING',
    RINGING = 'RINGING',
    ANSWERED = 'ANSWERED',
    MATCHED = 'MATCHED',
    NO_ANSWER = 'NO_ANSWER',
    BUSY = 'BUSY',
    FAILED = 'FAILED',
    CANCELED = 'CANCELED',
    COMPLETED = 'COMPLETED'
  }

  export interface RuleSet {
    id: string;
    name: string;
    description: string | null;
    config: unknown;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface Task {
    id: string;
    numbers: string[];
    userPhone: string;
    ruleSetId: string;
    ruleSet?: RuleSet | null;
    status: TaskStatus;
    perNumberMaxAttempts: number;
    globalMaxAttempts: number | null;
    timeWindowStart: Date | null;
    timeWindowEnd: Date | null;
    backoffPolicy: unknown;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
    lastAttemptedAt: Date | null;
    attempts?: CallAttempt[];
  }

  export interface CallAttempt {
    id: string;
    taskId: string;
    number: string;
    attemptNumber: number;
    status: CallAttemptStatus;
    callSid: string | null;
    reason: string | null;
    sipCode: number | null;
    matched: boolean;
    matchMetadata: unknown;
    jobId: string | null;
    scheduledFor: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
    nextRetryAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    task?: Task;
  }

  export namespace Prisma {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export type JsonObject = Record<string, any>;
    export type InputJsonValue = unknown;
  }

  export class PrismaClient {
    task: {
      create: (...args: unknown[]) => Promise<Task>;
      update: (...args: unknown[]) => Promise<Task>;
      findUnique: (...args: unknown[]) => Promise<Task | null>;
    };
    callAttempt: {
      create: (...args: unknown[]) => Promise<CallAttempt>;
      update: (...args: unknown[]) => Promise<CallAttempt>;
      findUnique: (...args: unknown[]) => Promise<CallAttempt | null>;
      findMany: (...args: unknown[]) => Promise<CallAttempt[]>;
      count: (...args: unknown[]) => Promise<number>;
    };
    ruleSet: {
      findUnique: (...args: unknown[]) => Promise<RuleSet | null>;
    };
    constructor(...args: unknown[]);
    $connect: () => Promise<void>;
    $disconnect: () => Promise<void>;
  }
}
