import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

vi.stubEnv('DATABASE_URL', 'postgresql://fake');
vi.stubEnv('JWT_SECRET', 'test-secret');

vi.mock('./db/client.js', () => ({
  db: { select: vi.fn() },
}));

const { createApp } = await import('./app.js');

describe('CORS', () => {
  it('allows the configured origin on a simple request', async () => {
    vi.stubEnv('CORS_ORIGIN', 'https://web.example.com');
    const app = createApp();

    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://web.example.com');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(
      'https://web.example.com',
    );
  });

  it('omits the allow-origin header for an origin that is not allowlisted', async () => {
    vi.stubEnv('CORS_ORIGIN', 'https://web.example.com');
    const app = createApp();

    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://evil.example.com');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('responds to a preflight request with the configured methods', async () => {
    vi.stubEnv('CORS_ORIGIN', 'https://web.example.com');
    const app = createApp();

    const res = await request(app)
      .options('/jobs')
      .set('Origin', 'https://web.example.com')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'authorization,content-type');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(
      'https://web.example.com',
    );
    expect(res.headers['access-control-allow-methods']).toMatch(/POST/);
  });

  it('supports a comma-separated list of allowed origins', async () => {
    vi.stubEnv(
      'CORS_ORIGIN',
      'https://web.example.com, https://staging.example.com',
    );
    const app = createApp();

    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://staging.example.com');

    expect(res.headers['access-control-allow-origin']).toBe(
      'https://staging.example.com',
    );
  });
});
