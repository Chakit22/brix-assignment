import express, { type Express } from 'express';
import type { HealthStatus } from '@brix/shared';

export function createApp(): Express {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    const body: HealthStatus = { status: 'ok' };
    res.status(200).json(body);
  });

  return app;
}
