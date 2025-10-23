import type { RedisOptions } from 'ioredis';
import { URL } from 'url';
import { env } from '../env.js';

const redisUrl = new URL(env.REDIS_URL);

export const connection: RedisOptions = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || '6379'),
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined,
  maxRetriesPerRequest: null,
  reconnectOnError: () => true,
  enableOfflineQueue: false,
  tls: redisUrl.protocol === 'rediss:' ? {} : undefined
};

// TODO: expose helper for sharing a singleton Redis connection + instrumentation hooks.
