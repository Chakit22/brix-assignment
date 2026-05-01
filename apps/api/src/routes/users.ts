import { Router, type Request, type Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users, userRoleEnum } from '../db/schema.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const VALID_ROLES = userRoleEnum.enumValues;

export const usersRouter: Router = Router();

usersRouter.get(
  '/users',
  requireAuth,
  requireRole('manager'),
  async (req: Request, res: Response) => {
    const role = req.query.role;
    let rows;

    if (role !== undefined) {
      if (typeof role !== 'string' || !VALID_ROLES.includes(role as typeof VALID_ROLES[number])) {
        res.status(400).json({ error: 'invalid_role' });
        return;
      }
      rows = await db
        .select()
        .from(users)
        .where(eq(users.role, role as typeof VALID_ROLES[number]));
    } else {
      rows = await db.select().from(users);
    }

    const sanitized = rows.map(({ passwordHash, ...rest }) => rest);
    res.status(200).json(sanitized);
  },
);
