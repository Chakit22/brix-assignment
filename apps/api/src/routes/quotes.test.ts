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

const mockQuotes = [
  { id: '1', title: 'Q1', description: null, customerName: 'Alice', address: '1 St', status: 'unscheduled' },
  { id: '2', title: 'Q2', description: null, customerName: 'Bob', address: '2 St', status: 'scheduled' },
  { id: '3', title: 'Q3', description: null, customerName: 'Carol', address: '3 St', status: 'unscheduled' },
];

function managerToken() {
  return jwt.sign({ userId: 'mgr-1', role: 'manager' }, JWT_SECRET);
}

function techToken() {
  return jwt.sign({ userId: 'tech-1', role: 'technician' }, JWT_SECRET);
}

function mockDbSelect(rows: typeof mockQuotes) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    then: vi.fn().mockImplementation((resolve: (v: unknown) => unknown) => Promise.resolve(resolve(rows))),
  };
  // make the chain thenable
  Object.assign(chain, { [Symbol.toStringTag]: 'Promise' });
  return chain;
}

describe('GET /quotes', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 401 when no token provided', async () => {
    const app = createApp();
    const res = await request(app).get('/quotes');
    expect(res.status).toBe(401);
  });

  it('returns 403 when technician calls the endpoint', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/quotes')
      .set('Authorization', `Bearer ${techToken()}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 with all quotes for manager', async () => {
    const { db } = await import('../db/client.js');
    const selectMock = db.select as ReturnType<typeof vi.fn>;
    selectMock.mockReturnValue(mockDbSelect(mockQuotes));

    const app = createApp();
    const res = await request(app)
      .get('/quotes')
      .set('Authorization', `Bearer ${managerToken()}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('filters by status=unscheduled', async () => {
    const unscheduled = mockQuotes.filter(q => q.status === 'unscheduled');
    const { db } = await import('../db/client.js');
    const selectMock = db.select as ReturnType<typeof vi.fn>;
    selectMock.mockReturnValue(mockDbSelect(unscheduled));

    const app = createApp();
    const res = await request(app)
      .get('/quotes?status=unscheduled')
      .set('Authorization', `Bearer ${managerToken()}`);
    expect(res.status).toBe(200);
    expect((res.body as typeof mockQuotes).every(q => q.status === 'unscheduled')).toBe(true);
  });
});
