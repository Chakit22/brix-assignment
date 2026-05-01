import './db/env.js';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { createApp } from './app.js';
import type { AuthDeps, NotificationsDeps, UserRecord } from './app.js';
import { db } from './db/client.js';
import { notifications, users } from './db/schema.js';
import { createJobAssignmentService } from './services/jobAssignment.js';
import { HttpError } from './middleware/errorHandler.js';
import type { Notification } from '@brix/shared';

const port = Number(process.env.PORT) || 3001;

const deps: AuthDeps = {
  async findUserByEmail(email) {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return rows[0] ? toUserRecord(rows[0]) : null;
  },
  async findUserById(id) {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return rows[0] ? toUserRecord(rows[0]) : null;
  },
};

function toUserRecord(row: typeof users.$inferSelect): UserRecord {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    passwordHash: row.passwordHash,
  };
}

const jobsService = createJobAssignmentService(db);

type NotificationRow = typeof notifications.$inferSelect;

function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    recipientUserId: row.recipientUserId,
    jobId: row.jobId,
    type: row.type,
    message: row.message,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

const notificationsDeps: NotificationsDeps = {
  async listNotifications({ recipientUserId }) {
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.recipientUserId, recipientUserId))
      .orderBy(desc(notifications.createdAt));
    const unreadRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientUserId, recipientUserId),
          isNull(notifications.readAt),
        ),
      );
    const unreadCount = unreadRows[0]?.count ?? 0;
    return {
      notifications: rows.map(toNotification),
      unreadCount,
    };
  },
  async markRead({ notificationId, recipientUserId }) {
    const updated = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.recipientUserId, recipientUserId),
        ),
      )
      .returning();
    if (!updated[0]) {
      throw new HttpError(404, 'Notification not found');
    }
    return toNotification(updated[0]);
  },
};

const app = createApp(deps, jobsService, notificationsDeps);

app.listen(port, () => {
  console.log(`api listening on http://localhost:${port}`);
});
