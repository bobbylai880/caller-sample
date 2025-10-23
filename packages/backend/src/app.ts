import express from 'express';
import morgan from 'morgan';
import routes from './routes/index.js';

export const createApp = () => {
  const app = express();

  app.use(express.json({ limit: '2mb' }));
  app.use(morgan('dev'));

  app.use(routes);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  });

  return app;
};
