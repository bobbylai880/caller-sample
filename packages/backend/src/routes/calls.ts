import type { Request, Response } from 'express';
import { Router } from 'express';

import { outboundCallRequestSchema } from '../schemas/voice.js';
import { voiceQueue } from '../services/voiceService.js';

const router = Router();

router.post('/calls/outbound', async (req: Request, res: Response) => {
  const parseResult = outboundCallRequestSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ errors: parseResult.error.flatten() });
  }

  const job = await voiceQueue.add('outbound-call', parseResult.data, {
    removeOnComplete: true,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    }
  });

  // TODO: hand the job off to a worker that dials Twilio's Programmable Voice API and bridges media streams.

  return res.status(202).json({ callSid: job.id, status: 'queued' });
});

export default router;
