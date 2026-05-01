import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';

vi.stubEnv('DATABASE_URL', 'postgresql://fake');
vi.mock('../db/client.js', () => ({ db: { select: vi.fn() } }));

const { createApp } = await import('../app.js');
import type { AuthDeps, UserRecord, NotificationsDeps } from '../app.js';
import type { LoginResponse, Notification } from '@brix/shared';
import { HttpError } from '../middleware/errorHandler.js';

const password = 'password123';

const bobId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const aliceId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const jobId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const notif1Id = '11111111-aaaa-aaaa-aaaa-111111111111';
const notif2Id = '22222222-aaaa-aaaa-aaaa-222222222222';
const otherNotifId = '33333333-aaaa-aaaa-aaaa-333333333333';

async function makeAuthDeps(): Promise<AuthDeps> {
  const passwordHash = await bcrypt.hash(password, 4);
  const bob: UserRecord = {
    id: bobId,
    email: 'bob@brix.local',
    name: 'Bob',
    role: 'technician',
    passwordHash,
  };
  const alice: UserRecord = {
    id: aliceId,
    email: 'alice@brix.local',
    name: 'Alice',
    role: 'technician',
    passwordHash,
  };
  const byEmail = new Map([
    [bob.email, bob],
    [alice.email, alice],
  ]);
  const byId = new Map([
    [bob.id, bob],
    [alice.id, alice],
  ]);
  return {
    findUserByEmail: async (email) => byEmail.get(email) ?? null,
    findUserById: async (id) => byId.get(id) ?? null,
  };
}

function makeNotif(overrides: Partial<Notification> = {}): Notification {
  return {
    id: notif1Id,
    recipientUserId: bobId,
    jobId,
    type: 'job_assigned',
    message: 'New job assigned starting 2026-06-01T09:00:00.000Z',
    readAt: null,
    createdAt: '2026-05-01T10:00:00.000Z',
    ...overrides,
  };
}

function makeNotificationsDeps(): NotificationsDeps {
  return {
    listNotifications: vi.fn(),
    markRead: vi.fn(),
  };
}

async function loginAs(app: ReturnType<typeof createApp>, email: string) {
  const res = await request(app)
    .post('/auth/login')
    .send({ email, password });
  return (res.body as LoginResponse).token;
}

describe('GET /notifications', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  it('returns 401 without a token', async () => {
    const app = createApp(await makeAuthDeps(), undefined, makeNotificationsDeps());
    const res = await request(app).get('/notifications');
    expect(res.status).toBe(401);
  });

  it('returns own notifications sorted desc with unreadCount', async () => {
    const newer = makeNotif({ id: notif2Id, createdAt: '2026-05-01T11:00:00.000Z' });
    const older = makeNotif({ id: notif1Id, createdAt: '2026-05-01T10:00:00.000Z', readAt: '2026-05-01T10:30:00.000Z' });
    const deps = makeNotificationsDeps();
    (deps.listNotifications as ReturnType<typeof vi.fn>).mockResolvedValue({
      notifications: [newer, older],
      unreadCount: 1,
    });

    const app = createApp(await makeAuthDeps(), undefined, deps);
    const token = await loginAs(app, 'bob@brix.local');

    const res = await request(app)
      .get('/notifications')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.unreadCount).toBe(1);
    expect(res.body.notifications).toHaveLength(2);
    expect(res.body.notifications[0].id).toBe(notif2Id);
    expect(deps.listNotifications).toHaveBeenCalledWith({ recipientUserId: bobId });
  });
});

describe('POST /notifications/:id/read', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  it('returns 401 without a token', async () => {
    const app = createApp(await makeAuthDeps(), undefined, makeNotificationsDeps());
    const res = await request(app).post(`/notifications/${notif1Id}/read`);
    expect(res.status).toBe(401);
  });

  it('marks own notification as read', async () => {
    const updated = makeNotif({ readAt: '2026-05-01T12:00:00.000Z' });
    const deps = makeNotificationsDeps();
    (deps.markRead as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

    const app = createApp(await makeAuthDeps(), undefined, deps);
    const token = await loginAs(app, 'bob@brix.local');

    const res = await request(app)
      .post(`/notifications/${notif1Id}/read`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.notification.readAt).toBe('2026-05-01T12:00:00.000Z');
    expect(deps.markRead).toHaveBeenCalledWith({
      notificationId: notif1Id,
      recipientUserId: bobId,
    });
  });

  it('returns 404 when notification belongs to another user', async () => {
    const deps = makeNotificationsDeps();
    (deps.markRead as ReturnType<typeof vi.fn>).mockRejectedValue(
      new HttpError(404, 'Notification not found'),
    );
    const app = createApp(await makeAuthDeps(), undefined, deps);
    const token = await loginAs(app, 'bob@brix.local');

    const res = await request(app)
      .post(`/notifications/${otherNotifId}/read`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('returns 400 on invalid uuid', async () => {
    const app = createApp(await makeAuthDeps(), undefined, makeNotificationsDeps());
    const token = await loginAs(app, 'bob@brix.local');
    const res = await request(app)
      .post('/notifications/not-a-uuid/read')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});
