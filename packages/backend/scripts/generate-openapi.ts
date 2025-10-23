import { mkdir, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { openApiDocument } from '../src/openapi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const outDir = resolve(__dirname, '../src/generated');
const openApiPath = resolve(outDir, 'openapi.json');
const typePath = resolve(outDir, 'types.d.ts');

await mkdir(outDir, { recursive: true });
await writeFile(openApiPath, JSON.stringify(openApiDocument, null, 2));

// dynamic import to avoid ESM issues
const { default: openapiTS } = await import('openapi-typescript');
const types = await openapiTS(openApiDocument, {
  alphabetize: true
});

await writeFile(typePath, types);

// eslint-disable-next-line no-console
console.log(`Generated OpenAPI spec at ${openApiPath} and types at ${typePath}`);
