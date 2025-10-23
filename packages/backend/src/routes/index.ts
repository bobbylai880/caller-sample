import { Router } from 'express';
import callsRouter from './calls.js';
import docsRouter from './docs.js';
import healthRouter from './health.js';

const router = Router();

router.use(healthRouter);
router.use(docsRouter);
router.use(callsRouter);

// TODO: add routers for Twilio voice webhooks, media stream ingestion, and transcription callbacks.

export default router;
