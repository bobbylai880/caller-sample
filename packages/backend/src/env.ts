import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(0).default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  TWILIO_ACCOUNT_SID: z.string().min(1, 'Required'),
  TWILIO_AUTH_TOKEN: z.string().min(1, 'Required'),
  TWILIO_FROM: z.string().min(1, 'Required'),
  PUBLIC_BASE_URL: z
    .string()
    .url()
    .describe('Publicly accessible base URL that Twilio can reach'),
  MEDIA_STREAM_BASE_URL: z
    .string()
    .url()
    .optional()
    .describe('WSS endpoint used for Twilio <Start><Stream> callbacks'),
  SPEECH_PROVIDER: z.enum(['deepgram', 'gcp']).default('deepgram'),
  DEEPGRAM_API_KEY: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  FCM_SERVICE_ACCOUNT: z.string().optional()
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
