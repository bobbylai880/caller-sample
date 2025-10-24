import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';

import { env } from './env.js';
import { healthRegistry } from './schemas/health.js';
import { voiceRegistry } from './schemas/voice.js';

const rootRegistry = new OpenAPIRegistry();

rootRegistry.registerComponent('securitySchemes', 'BearerAuth', {
  type: 'http',
  scheme: 'bearer'
});

const registries: OpenAPIRegistry[] = [rootRegistry, healthRegistry, voiceRegistry];

type GeneratorInput = ConstructorParameters<typeof OpenApiGeneratorV3>[0];
const registryDefinitions = registries.flatMap((registry) => registry.definitions);

export const generator = new OpenApiGeneratorV3(registryDefinitions as unknown as GeneratorInput);

export const openApiDocument = generator.generateDocument({
  openapi: '3.1.0',
  info: {
    title: 'Caller Cloud Dialer API',
    version: '0.1.0'
  },
  servers: [
    {
      url: `http://localhost:${env.PORT}`,
      description: 'Local dev server'
    }
  ]
});
