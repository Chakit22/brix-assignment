import { describe, it, expect, beforeEach } from 'vitest';
import { signToken, verifyToken } from './jwt.js';

describe('jwt', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  it('signs and verifies a token roundtrip', () => {
    const token = signToken({ userId: 'user-1', role: 'manager' });
    const payload = verifyToken(token);

    expect(payload.userId).toBe('user-1');
    expect(payload.role).toBe('manager');
  });

  it('rejects a token signed with a different secret', () => {
    process.env.JWT_SECRET = 'secret-a';
    const token = signToken({ userId: 'user-1', role: 'technician' });

    process.env.JWT_SECRET = 'secret-b';
    expect(() => verifyToken(token)).toThrow();
  });

  it('rejects a malformed token', () => {
    expect(() => verifyToken('not-a-real-token')).toThrow();
  });

  it('throws if JWT_SECRET is unset when signing', () => {
    delete process.env.JWT_SECRET;
    expect(() => signToken({ userId: 'u', role: 'manager' })).toThrow(
      /JWT_SECRET/,
    );
  });
});
