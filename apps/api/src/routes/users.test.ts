import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';

const JWT_SECRET = 'test-secret';

vi.stubEnv('JWT_SECRET', JWT_SECRET);
vi.stubEnv('DATABASE_URL', 'postgresql://fake');

vi.mock('../db/client.js', () => ({
  db: {
    select: vi.fn(),
  },
}));

const mockUsers = [
  { id: 'u1', email: 'tech1@brix.local', name: 'Tech One', role: 'technician', passwordHash: 'hashed' },
  { id: 'u2', email: 'tech2@brix.local', name: 'Tech Two', role: 'technician', passwordHash: 'hashed' },
  { id: 'u3', email: 'tech3@brix.local', name: 'Tech Three', role: 'technician', passwordHash: 'hashed' },
];

function managerToken() {
  return jwt.sign({ userId: 'mgr-1', role: 'manager' }, JWT_SECRET);
}

function techToken() {
  return jwt.sign({ userId: 'tech-1', role: 'technician' }, JWT_SECRET);
}

function mockDbSelect(rows: typeof mockUsers) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    then: vi.fn().mockImplementation((resolve: (v: unknown) => unknown) => Promise.resolve(resolve(rows))),
  };
}

describe('GET /users', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 401 when no token provided', async () => {
    const app = createApp();
    const res = await request(app).get('/users');
    expect(res.status).toBe(401);
  });

  it('returns 403 when technician calls the endpoint', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/users')
      .set('Authorization', `Bearer ${techToken()}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 with technicians for manager', async () => {
    const { db } = await import('../db/client.js');
    const selectMock = db.select as ReturnType<typeof vi.fn>;
    selectMock.mockReturnValue(mockDbSelect(mockUsers));

    const app = createApp();
    const res = await request(app)
      .get('/users?role=technician')
      .set('Authorization', `Bearer ${managerToken()}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect((res.body as typeof mockUsers).length).toBe(3);
  });

  it('strips password_hash from response', async () => {
    const { db } = await import('../db/client.js');
    const selectMock = db.select as ReturnType<typeof vi.fn>;
    selectMock.mockReturnValue(mockDbSelect(mockUsers));

    const app = createApp();
    const res = await request(app)
      .get('/users?role=technician')
      .set('Authorization', `Bearer ${managerToken()}`);
    expect(res.status).toBe(200);
    const users = res.body as Record<string, unknown>[];
    users.forEach(u => {
      expect(u).not.toHaveProperty('passwordHash');
      expect(u).not.toHaveProperty('password_hash');
    });
  });
});
