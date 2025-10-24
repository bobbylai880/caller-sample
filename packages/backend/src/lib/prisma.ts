import { PrismaClient } from '@prisma/client';

const isTestEnvironment = process.env.VITEST_WORKER_ID !== undefined || process.env.NODE_ENV === 'test';

const createStubPrisma = (): PrismaClient => {
  const notImplemented = async () => {
    throw new Error('Prisma client is not available in the current environment.');
  };

  return {
    task: {
      create: notImplemented,
      update: notImplemented,
      findUnique: notImplemented,
      findMany: notImplemented,
      count: notImplemented
    },
    callAttempt: {
      create: notImplemented,
      update: notImplemented,
      findUnique: notImplemented,
      findMany: notImplemented,
      count: notImplemented
    },
    ruleSet: {
      findUnique: notImplemented
    }
  } as unknown as PrismaClient;
};

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

const prismaClient = isTestEnvironment
  ? createStubPrisma()
  : global.__prisma__ ??
    new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error']
    });

export const prisma: PrismaClient = prismaClient;

if (!isTestEnvironment && process.env.NODE_ENV !== 'production') {
  global.__prisma__ = prismaClient;
}
