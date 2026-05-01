import type { RequestHandler } from 'express';
import type { UserRole } from '@brix/shared';
import { verifyToken, type JwtPayload } from '../lib/jwt.js';
import { HttpError } from './errorHandler.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.header('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new HttpError(401, 'Missing or malformed Authorization header'));
  }
  try {
    req.user = verifyToken(token);
    return next();
  } catch {
    return next(new HttpError(401, 'Invalid or expired token'));
  }
};

export function requireRole(role: UserRole): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new HttpError(401, 'Not authenticated'));
    }
    if (req.user.role !== role) {
      return next(new HttpError(403, 'Forbidden'));
    }
    return next();
  };
}
