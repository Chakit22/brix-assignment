import { describe, it, expect, vi } from 'vitest';
import { ensureExtensions } from './extensions.js';

describe('ensureExtensions', () => {
  it('creates uuid-ossp and btree_gist (idempotent)', async () => {
    const calls: string[] = [];
    const fakeClient = {
      query: vi.fn(async (sql: string) => {
        calls.push(sql);
        return { rowCount: 0 };
      }),
    };

    await ensureExtensions(fakeClient as never);

    expect(fakeClient.query).toHaveBeenCalledTimes(2);
    expect(calls[0]).toMatch(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp"/i);
    expect(calls[1]).toMatch(/CREATE EXTENSION IF NOT EXISTS "btree_gist"/i);
  });
});
