import { Router } from 'express';

import callsRouter from './calls.js';
import docsRouter from './docs.js';
import healthRouter from './health.js';
import tasksRouter from './tasks.js';
import twilioVoiceRouter from './twilioVoice.js';

const router = Router();

router.use(healthRouter);
router.use(docsRouter);
router.use(callsRouter);
router.use(tasksRouter);
router.use(twilioVoiceRouter);

export default router;
