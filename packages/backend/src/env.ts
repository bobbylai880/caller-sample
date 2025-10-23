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
  TWILIO_CALLER_ID: z.string().min(1, 'Required'),
  TWILIO_VOICE_WEBHOOK_URL: z
    .string()
    .url()
    .describe('Publicly accessible webhook used by Twilio to control outbound calls'),
  SPEECH_PROVIDER: z.enum(['deepgram', 'gcp']).default('deepgram'),
  DEEPGRAM_API_KEY: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  FCM_SERVER_KEY: z.string().optional()
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
