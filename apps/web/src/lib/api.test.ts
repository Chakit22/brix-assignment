import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ApiClient, ApiError } from './api';

const ORIGINAL_FETCH = globalThis.fetch;

describe('ApiClient', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  it('attaches Authorization: Bearer <token> when token is set', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const client = new ApiClient({ baseUrl: 'http://api.test' });
    client.setToken('jwt-abc');
    await client.get('/me');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0]!;
    const headers = new Headers(init?.headers);
    expect(headers.get('Authorization')).toBe('Bearer jwt-abc');
  });

  it('omits Authorization header when no token is set', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const client = new ApiClient({ baseUrl: 'http://api.test' });
    await client.get('/health');

    const [, init] = fetchMock.mock.calls[0]!;
    const headers = new Headers(init?.headers);
    expect(headers.get('Authorization')).toBeNull();
  });

  it('calls onUnauthorized and throws ApiError on 401', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const onUnauthorized = vi.fn();
    const client = new ApiClient({ baseUrl: 'http://api.test', onUnauthorized });
    client.setToken('expired');

    await expect(client.get('/me')).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('throws ApiError with status and parsed body for non-2xx responses', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'bad request', code: 'BAD' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const client = new ApiClient({ baseUrl: 'http://api.test' });
    try {
      await client.post('/jobs', { foo: 1 });
      expect.fail('expected ApiError');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(400);
      expect(apiErr.body).toEqual({ error: 'bad request', code: 'BAD' });
    }
  });

  it('serializes JSON body and sets Content-Type for POST', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 1 }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const client = new ApiClient({ baseUrl: 'http://api.test' });
    const body = { email: 'a@b.co', password: 'pw' };
    await client.post('/auth/login', body);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://api.test/auth/login');
    expect(init?.method).toBe('POST');
    const headers = new Headers(init?.headers);
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(init?.body).toBe(JSON.stringify(body));
  });
});
