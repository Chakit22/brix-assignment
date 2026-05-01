import jwt from 'jsonwebtoken';
import type { UserRole } from '@brix/shared';

export type JwtPayload = {
  userId: string;
  role: UserRole;
};

const EXPIRY = '7d';

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return secret;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: EXPIRY });
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, getSecret());
  if (
    typeof decoded !== 'object' ||
    decoded === null ||
    typeof (decoded as { userId?: unknown }).userId !== 'string' ||
    typeof (decoded as { role?: unknown }).role !== 'string'
  ) {
    throw new Error('Invalid token payload');
  }
  const { userId, role } = decoded as { userId: string; role: string };
  if (role !== 'manager' && role !== 'technician') {
    throw new Error('Invalid role in token');
  }
  return { userId, role };
}
