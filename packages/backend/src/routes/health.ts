import type { Request, Response } from 'express';
import { Router } from 'express';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

router.get('/ready', async (_req: Request, res: Response) => {
  // TODO: implement checks against Redis, PostgreSQL, and third-party services.
  res.json({
    status: 'ready',
    dependencies: [
      { name: 'postgres', healthy: false, details: 'TODO: implement connectivity check' },
      { name: 'redis', healthy: false, details: 'TODO: implement connectivity check' }
    ]
  });
});

export default router;
