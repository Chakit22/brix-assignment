import { Router } from 'express';
import bcrypt from 'bcryptjs';
import type { AuthUser, LoginResponse } from '@brix/shared';
import type { AuthDeps, UserRecord } from '../app.js';
import { signToken } from '../lib/jwt.js';
import { HttpError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';

function toAuthUser(u: UserRecord): AuthUser {
  return { id: u.id, email: u.email, name: u.name, role: u.role };
}

export function createAuthRouter(deps: AuthDeps): Router {
  const router = Router();

  router.post('/login', async (req, _res, next) => {
    try {
      const { email, password } = req.body ?? {};
      if (typeof email !== 'string' || typeof password !== 'string') {
        throw new HttpError(400, 'email and password are required');
      }
      const user = await deps.findUserByEmail(email);
      if (!user) {
        throw new HttpError(401, 'Invalid credentials');
      }
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        throw new HttpError(401, 'Invalid credentials');
      }
      const token = signToken({ userId: user.id, role: user.role });
      const body: LoginResponse = { token, user: toAuthUser(user) };
      _res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  });

  router.get('/me', requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new HttpError(401, 'Not authenticated');
      }
      const user = await deps.findUserById(userId);
      if (!user) {
        throw new HttpError(401, 'User no longer exists');
      }
      res.status(200).json({ user: toAuthUser(user) });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
