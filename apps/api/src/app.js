import cors from 'cors';
import express from 'express';
import cron from 'node-cron';
import { config } from './config.js';
import { migrate } from './db/migrate.js';
import { seed } from './db/seed.js';
import { authRoutes } from './routes/auth-routes.js';
import { airiqRoutes } from './routes/airiq-routes.js';
import { errorHandler, notFound } from './middleware/error-handler.js';
import { runEtl } from './pipeline/etl-pipeline.js';

export async function createApp() {
  migrate();
  await seed();

  const app = express();
  app.use(cors({ origin: config.WEB_ORIGIN.split(',').map((origin) => origin.trim()), credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'airiq-api', stack: 'express-sqlite', timestamp: new Date().toISOString() });
  });

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1', airiqRoutes);
  app.use(notFound);
  app.use(errorHandler);

  if (config.ENABLE_CRON) {
    cron.schedule('0 6 * * *', () => {
      runEtl({ source: 'real', daysBack: 3 }).catch((error) => console.error('[etl cron failed]', error));
    });
  }

  return app;
}
