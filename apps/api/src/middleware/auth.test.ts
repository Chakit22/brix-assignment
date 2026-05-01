import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { signToken } from '../lib/jwt.js';
import { requireAuth, requireRole } from './auth.js';
import { errorHandler } from './errorHandler.js';

function buildApp() {
  const app = express();
  app.get('/protected', requireAuth, (req, res) => {
    res.json({ user: (req as express.Request & { user?: unknown }).user });
  });
  app.get(
    '/manager-only',
    requireAuth,
    requireRole('manager'),
    (_req, res) => {
      res.json({ ok: true });
    },
  );
  app.use(errorHandler);
  return app;
}

describe('requireAuth', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  it('returns 401 if Authorization header is missing', async () => {
    const res = await request(buildApp()).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.error).toBeTruthy();
  });

  it('returns 401 if Authorization header is malformed', async () => {
    const res = await request(buildApp())
      .get('/protected')
      .set('Authorization', 'NotBearer xyz');
    expect(res.status).toBe(401);
  });

  it('returns 401 if token is invalid', async () => {
    const res = await request(buildApp())
      .get('/protected')
      .set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  it('attaches req.user when token is valid', async () => {
    const token = signToken({ userId: 'user-1', role: 'technician' });
    const res = await request(buildApp())
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ userId: 'user-1', role: 'technician' });
  });
});

describe('requireRole', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  it('passes through when role matches', async () => {
    const token = signToken({ userId: 'u', role: 'manager' });
    const res = await request(buildApp())
      .get('/manager-only')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 403 when role does not match', async () => {
    const token = signToken({ userId: 'u', role: 'technician' });
    const res = await request(buildApp())
      .get('/manager-only')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBeTruthy();
  });
});
