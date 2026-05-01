import { Router, type Request, type Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { quotes, quoteStatusEnum } from '../db/schema.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const VALID_STATUSES = quoteStatusEnum.enumValues;

export const quotesRouter: Router = Router();

quotesRouter.get(
  '/quotes',
  requireAuth,
  requireRole('manager'),
  async (req: Request, res: Response) => {
    const status = req.query.status;

    if (status !== undefined) {
      if (typeof status !== 'string' || !VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
        res.status(400).json({ error: 'invalid_status' });
        return;
      }
      const rows = await db
        .select()
        .from(quotes)
        .where(eq(quotes.status, status as typeof VALID_STATUSES[number]));
      res.status(200).json(rows);
      return;
    }

    const rows = await db.select().from(quotes);
    res.status(200).json(rows);
  },
);
