import express, { type Express } from 'express';
import type { HealthStatus, UserRole } from '@brix/shared';
import { createAuthRouter } from './routes/auth.js';
import { quotesRouter } from './routes/quotes.js';
import { usersRouter } from './routes/users.js';
import { errorHandler } from './middleware/errorHandler.js';

export type UserRecord = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
};

export type AuthDeps = {
  findUserByEmail: (email: string) => Promise<UserRecord | null>;
  findUserById: (id: string) => Promise<UserRecord | null>;
};

export function createApp(deps?: AuthDeps): Express {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    const body: HealthStatus = { status: 'ok' };
    res.status(200).json(body);
  });

  if (deps) {
    app.use('/auth', createAuthRouter(deps));
  }

  app.use(quotesRouter);
  app.use(usersRouter);

  app.use(errorHandler);

  return app;
}
