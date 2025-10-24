import { createServer } from 'http';

import { createApp } from './app.js';
import { env } from './env.js';
import './workers/outboundDialer.js';

const app = createApp();

const server = createServer(app);

server.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on port ${env.PORT}`);
});

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});
