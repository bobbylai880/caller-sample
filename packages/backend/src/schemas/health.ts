import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

export const healthRegistry = new OpenAPIRegistry();

export const healthStatusSchema = z.object({
  status: z.literal('ok')
});

export const readinessStatusSchema = z.object({
  status: z.literal('ready'),
  dependencies: z.array(
    z.object({
      name: z.string(),
      healthy: z.boolean(),
      details: z.string().optional()
    })
  )
});

healthRegistry.registerPath({
  method: 'get',
  path: '/health',
  summary: 'Liveness probe',
  tags: ['Health'],
  responses: {
    200: {
      description: 'Service is up',
      content: {
        'application/json': {
          schema: healthStatusSchema
        }
      }
    }
  }
});

healthRegistry.registerPath({
  method: 'get',
  path: '/ready',
  summary: 'Readiness probe',
  tags: ['Health'],
  responses: {
    200: {
      description: 'Service dependencies are available',
      content: {
        'application/json': {
          schema: readinessStatusSchema
        }
      }
    }
  }
});
