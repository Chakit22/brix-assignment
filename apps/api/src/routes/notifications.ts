import { Router } from 'express';
import type {
  Notification,
  NotificationResponse,
  NotificationsListResponse,
} from '@brix/shared';
import { HttpError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';

export type NotificationsDeps = {
  listNotifications: (input: {
    recipientUserId: string;
  }) => Promise<{ notifications: Notification[]; unreadCount: number }>;
  markRead: (input: {
    notificationId: string;
    recipientUserId: string;
  }) => Promise<Notification>;
};

function isUuid(s: unknown): s is string {
  return (
    typeof s === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
  );
}

export function createNotificationsRouter(deps: NotificationsDeps): Router {
  const router = Router();

  router.get('/', requireAuth, async (req, res, next) => {
    try {
      const recipientUserId = req.user!.userId;
      const result = await deps.listNotifications({ recipientUserId });
      const out: NotificationsListResponse = {
        notifications: result.notifications,
        unreadCount: result.unreadCount,
      };
      res.status(200).json(out);
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/read', requireAuth, async (req, res, next) => {
    try {
      const notificationId = req.params.id;
      if (!isUuid(notificationId)) {
        throw new HttpError(400, 'invalid notification id');
      }
      const recipientUserId = req.user!.userId;
      const notification = await deps.markRead({
        notificationId,
        recipientUserId,
      });
      const out: NotificationResponse = { notification };
      res.status(200).json(out);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
