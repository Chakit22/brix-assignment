import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

vi.stubEnv('DATABASE_URL', 'postgresql://fake');
vi.stubEnv('JWT_SECRET', 'test-secret');

vi.mock('./db/client.js', () => ({
  db: { select: vi.fn() },
}));

const { createApp } = await import('./app.js');
import type { HealthStatus } from '@brix/shared';

describe('GET /health', () => {
  it('returns 200 with { status: "ok" }', async () => {
    const app = createApp();
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    const body = res.body as HealthStatus;
    expect(body.status).toBe('ok');
  });
});
