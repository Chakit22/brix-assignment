import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';

vi.stubEnv('DATABASE_URL', 'postgresql://fake');
vi.mock('../db/client.js', () => ({ db: { select: vi.fn() } }));

const { createApp } = await import('../app.js');
import type { AuthDeps, UserRecord } from '../app.js';
import type { LoginResponse } from '@brix/shared';

const password = 'password123';

async function makeDeps(): Promise<AuthDeps> {
  const passwordHash = await bcrypt.hash(password, 4);
  const manager: UserRecord = {
    id: 'mgr-1',
    email: 'manager@brix.local',
    name: 'Maya Manager',
    role: 'manager',
    passwordHash,
  };
  const tech: UserRecord = {
    id: 'tech-1',
    email: 'tech@brix.local',
    name: 'Tara Technician',
    role: 'technician',
    passwordHash,
  };
  const usersByEmail = new Map<string, UserRecord>([
    [manager.email, manager],
    [tech.email, tech],
  ]);
  const usersById = new Map<string, UserRecord>([
    [manager.id, manager],
    [tech.id, tech],
  ]);
  return {
    findUserByEmail: async (email: string) =>
      usersByEmail.get(email) ?? null,
    findUserById: async (id: string) => usersById.get(id) ?? null,
  };
}

describe('POST /auth/login', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  it('returns 200 with token + user for valid manager credentials', async () => {
    const app = createApp(await makeDeps());
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'manager@brix.local', password });

    expect(res.status).toBe(200);
    const body = res.body as LoginResponse;
    expect(body.token).toEqual(expect.any(String));
    expect(body.user.email).toBe('manager@brix.local');
    expect(body.user.role).toBe('manager');
    expect(body.user).not.toHaveProperty('passwordHash');
  });

  it('returns 200 with role technician for technician credentials', async () => {
    const app = createApp(await makeDeps());
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'tech@brix.local', password });

    expect(res.status).toBe(200);
    expect((res.body as LoginResponse).user.role).toBe('technician');
  });

  it('returns 401 on wrong password', async () => {
    const app = createApp(await makeDeps());
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'manager@brix.local', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeTruthy();
  });

  it('returns 401 on unknown email', async () => {
    const app = createApp(await makeDeps());
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@brix.local', password });

    expect(res.status).toBe(401);
  });

  it('returns 400 on missing fields', async () => {
    const app = createApp(await makeDeps());
    const res = await request(app).post('/auth/login').send({});
    expect(res.status).toBe(400);
  });
});

describe('GET /auth/me', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  it('returns the current user given a valid token', async () => {
    const deps = await makeDeps();
    const app = createApp(deps);

    const login = await request(app)
      .post('/auth/login')
      .send({ email: 'tech@brix.local', password });
    const token = (login.body as LoginResponse).token;

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('tech@brix.local');
    expect(res.body.user.role).toBe('technician');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('returns 401 without a token', async () => {
    const app = createApp(await makeDeps());
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });
});
