import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';

import { openApiDocument } from '../openapi.js';

const router = Router();

router.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
router.get('/docs.json', (_req, res) => {
  res.json(openApiDocument);
});

export default router;
