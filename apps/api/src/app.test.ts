import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
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
