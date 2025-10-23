import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

export const voiceRegistry = new OpenAPIRegistry();

export const outboundCallRequestSchema = z.object({
  to: z.string().describe('E.164 formatted destination'),
  metadata: z.record(z.string(), z.string()).optional(),
  mediaStreamWebhookUrl: z
    .string()
    .url()
    .optional()
    .describe('Optional override for media stream webhook URL'),
  transcription: z
    .object({
      provider: z.enum(['deepgram', 'gcp']).default('deepgram'),
      language: z.string().default('en-US')
    })
    .optional()
});

export const outboundCallResponseSchema = z.object({
  callSid: z.string(),
  status: z.string()
});

voiceRegistry.registerPath({
  method: 'post',
  path: '/calls/outbound',
  description:
    'Initiate an outbound call from the cloud dialer and optionally bridge to a media stream.',
  summary: 'Create outbound call',
  tags: ['Voice'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: outboundCallRequestSchema
        }
      },
      required: true
    }
  },
  responses: {
    202: {
      description: 'Call accepted for processing',
      content: {
        'application/json': {
          schema: outboundCallResponseSchema
        }
      }
    }
  }
});

// TODO: register additional endpoints for Twilio webhooks, media streams, and transcription callbacks.
