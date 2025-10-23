process.env.PORT = process.env.PORT ?? '3000';
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/caller';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
process.env.TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? 'ACtest';
process.env.TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? 'test';
process.env.TWILIO_CALLER_ID = process.env.TWILIO_CALLER_ID ?? '+15555555555';
process.env.TWILIO_VOICE_WEBHOOK_URL =
  process.env.TWILIO_VOICE_WEBHOOK_URL ?? 'https://example.com/twilio/webhook';
process.env.SPEECH_PROVIDER = process.env.SPEECH_PROVIDER ?? 'deepgram';
