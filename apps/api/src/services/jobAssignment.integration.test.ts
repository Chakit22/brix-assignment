import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { notifications, jobs, quotes, users } from '../db/schema.js';
import { createJobAssignmentService } from './jobAssignment.js';
import { HttpError } from '../middleware/errorHandler.js';

const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

describeIfDb('jobAssignment service (integration)', () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzle>;
  let service: ReturnType<typeof createJobAssignmentService>;
  let managerId: string;
  let techAId: string;
  let techBId: string;

  beforeAll(async () => {
    pool = new Pool({ connectionString: DATABASE_URL });
    db = drizzle(pool);
    service = createJobAssignmentService(db);

    const passwordHash = await bcrypt.hash('x', 4);
    const tag = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const u = await db
      .insert(users)
      .values([
        {
          email: `mgr-${tag}@test.local`,
          name: 'Mgr',
          role: 'manager',
          passwordHash,
        },
        {
          email: `tecA-${tag}@test.local`,
          name: 'TecA',
          role: 'technician',
          passwordHash,
        },
        {
          email: `tecB-${tag}@test.local`,
          name: 'TecB',
          role: 'technician',
          passwordHash,
        },
      ])
      .returning({ id: users.id, role: users.role, email: users.email });
    managerId = u.find((r) => r.email === `mgr-${tag}@test.local`)!.id;
    techAId = u.find((r) => r.email === `tecA-${tag}@test.local`)!.id;
    techBId = u.find((r) => r.email === `tecB-${tag}@test.local`)!.id;
  });

  afterAll(async () => {
    if (pool) await pool.end();
  });

  async function freshQuote(title = 'Test'): Promise<string> {
    const [q] = await db
      .insert(quotes)
      .values({ title, customerName: 'Cust', address: '1 Main St' })
      .returning({ id: quotes.id });
    return q.id;
  }

  async function clearJobs() {
    await db.execute(sql`DELETE FROM notifications`);
    await db.execute(sql`DELETE FROM jobs`);
    await db.execute(sql`UPDATE quotes SET status = 'unscheduled'`);
  }

  beforeEach(async () => {
    await clearJobs();
  });

  it('createJob inserts a job, notification, and flips quote to scheduled', async () => {
    const quoteId = await freshQuote('Tap');
    const job = await service.createJob({
      managerId,
      quoteId,
      technicianId: techAId,
      startTime: '2026-07-01T09:00:00.000Z',
    });

    expect(job.endTime).toBe('2026-07-01T11:00:00.000Z');
    expect(job.status).toBe('scheduled');
    expect(job.quote.status).toBe('scheduled');

    const notifs = await db.execute<{ type: string; recipient_user_id: string; job_id: string }>(
      sql`SELECT type, recipient_user_id, job_id FROM notifications WHERE job_id = ${job.id}`,
    );
    expect(notifs.rows).toHaveLength(1);
    expect(notifs.rows[0].type).toBe('job_assigned');
    expect(notifs.rows[0].recipient_user_id).toBe(techAId);
  });

  it('createJob throws 409 on sequential overlap', async () => {
    const q1 = await freshQuote('A');
    const q2 = await freshQuote('B');
    await service.createJob({
      managerId,
      quoteId: q1,
      technicianId: techAId,
      startTime: '2026-07-02T09:00:00.000Z',
    });

    await expect(
      service.createJob({
        managerId,
        quoteId: q2,
        technicianId: techAId,
        startTime: '2026-07-02T10:00:00.000Z',
      }),
    ).rejects.toMatchObject({
      status: 409,
    });
  });

  it('concurrent overlap: exactly one of two parallel inserts succeeds', async () => {
    const q1 = await freshQuote('Concurrent A');
    const q2 = await freshQuote('Concurrent B');

    const results = await Promise.allSettled([
      service.createJob({
        managerId,
        quoteId: q1,
        technicianId: techAId,
        startTime: '2026-07-03T09:00:00.000Z',
      }),
      service.createJob({
        managerId,
        quoteId: q2,
        technicianId: techAId,
        startTime: '2026-07-03T10:00:00.000Z',
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    const reason = (rejected[0] as PromiseRejectedResult).reason;
    expect(reason).toBeInstanceOf(HttpError);
    expect((reason as HttpError).status).toBe(409);
  });

  it('non-overlapping windows on same technician both succeed', async () => {
    const q1 = await freshQuote('Slot 1');
    const q2 = await freshQuote('Slot 2');
    await service.createJob({
      managerId,
      quoteId: q1,
      technicianId: techAId,
      startTime: '2026-07-04T09:00:00.000Z',
    });
    await service.createJob({
      managerId,
      quoteId: q2,
      technicianId: techAId,
      startTime: '2026-07-04T11:00:00.000Z',
    });
  });

  it('patchJob (manager reschedule) writes job_rescheduled notification', async () => {
    const quoteId = await freshQuote('Resched');
    const created = await service.createJob({
      managerId,
      quoteId,
      technicianId: techAId,
      startTime: '2026-07-05T09:00:00.000Z',
    });

    const updated = await service.patchJob({
      jobId: created.id,
      actor: { userId: managerId, role: 'manager' },
      patch: { startTime: '2026-07-05T13:00:00.000Z' },
    });
    expect(updated.startTime).toBe('2026-07-05T13:00:00.000Z');
    expect(updated.endTime).toBe('2026-07-05T15:00:00.000Z');

    const notifs = await db.execute<{ type: string }>(
      sql`SELECT type FROM notifications WHERE job_id = ${created.id} ORDER BY created_at`,
    );
    expect(notifs.rows.map((r) => r.type)).toEqual(['job_assigned', 'job_rescheduled']);
  });

  it('patchJob (manager reassign) re-runs conflict check and throws 409', async () => {
    const q1 = await freshQuote('A');
    const q2 = await freshQuote('B');
    // Tech A has 09-11, Tech B has 09-11. Try to reassign B's job to Tech A → conflict.
    await service.createJob({
      managerId,
      quoteId: q1,
      technicianId: techAId,
      startTime: '2026-07-06T09:00:00.000Z',
    });
    const techBJob = await service.createJob({
      managerId,
      quoteId: q2,
      technicianId: techBId,
      startTime: '2026-07-06T09:00:00.000Z',
    });

    await expect(
      service.patchJob({
        jobId: techBJob.id,
        actor: { userId: managerId, role: 'manager' },
        patch: { technicianId: techAId },
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('patchJob (tech complete) flips status, sets quote completed, notifies manager', async () => {
    const quoteId = await freshQuote('Done');
    const created = await service.createJob({
      managerId,
      quoteId,
      technicianId: techAId,
      startTime: '2026-07-07T09:00:00.000Z',
    });

    const updated = await service.patchJob({
      jobId: created.id,
      actor: { userId: techAId, role: 'technician' },
      patch: { status: 'completed' },
    });
    expect(updated.status).toBe('completed');
    expect(updated.quote.status).toBe('completed');

    const notifs = await db.execute<{ type: string; recipient_user_id: string }>(
      sql`SELECT type, recipient_user_id FROM notifications WHERE job_id = ${created.id} AND type = 'job_completed'`,
    );
    expect(notifs.rows).toHaveLength(1);
    expect(notifs.rows[0].recipient_user_id).toBe(managerId);
  });

  it('patchJob (tech complete on someone else job) throws 403', async () => {
    const quoteId = await freshQuote('Other');
    const created = await service.createJob({
      managerId,
      quoteId,
      technicianId: techAId,
      startTime: '2026-07-08T09:00:00.000Z',
    });

    await expect(
      service.patchJob({
        jobId: created.id,
        actor: { userId: techBId, role: 'technician' },
        patch: { status: 'completed' },
      }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('patchJob on missing job throws 404', async () => {
    await expect(
      service.patchJob({
        jobId: '00000000-0000-0000-0000-000000000000',
        actor: { userId: managerId, role: 'manager' },
        patch: { startTime: '2026-07-09T09:00:00.000Z' },
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('listJobs filters by technicianId and returns embedded quote', async () => {
    const q1 = await freshQuote('A');
    const q2 = await freshQuote('B');
    await service.createJob({
      managerId,
      quoteId: q1,
      technicianId: techAId,
      startTime: '2026-07-10T09:00:00.000Z',
    });
    await service.createJob({
      managerId,
      quoteId: q2,
      technicianId: techBId,
      startTime: '2026-07-10T09:00:00.000Z',
    });

    const techAJobs = await service.listJobs({ technicianId: techAId });
    expect(techAJobs).toHaveLength(1);
    expect(techAJobs[0].technicianId).toBe(techAId);
    expect(techAJobs[0].quote.title).toBe('A');
  });
});
