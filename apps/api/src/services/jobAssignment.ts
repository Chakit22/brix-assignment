import { eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type {
  Job,
  JobStatus,
  NotificationType,
  QuoteSummary,
  Role,
} from '@brix/shared';
import { jobs, notifications, quotes, users } from '../db/schema.js';
import { HttpError } from '../middleware/errorHandler.js';

const JOB_DURATION_HOURS = 2;

export type CreateJobInput = {
  managerId: string;
  quoteId: string;
  technicianId: string;
  startTime: string;
};

export type ListJobsInput = {
  technicianId: string;
};

export type PatchJobInput = {
  jobId: string;
  actor: { userId: string; role: Role };
  patch: {
    startTime?: string;
    technicianId?: string;
    status?: JobStatus;
  };
};

export type JobAssignmentService = {
  createJob: (input: CreateJobInput) => Promise<Job>;
  listJobs: (input: ListJobsInput) => Promise<Job[]>;
  patchJob: (input: PatchJobInput) => Promise<Job>;
};

type AnyDb = NodePgDatabase<Record<string, unknown>>;

type JobRow = typeof jobs.$inferSelect;
type QuoteRow = typeof quotes.$inferSelect;

function addHours(iso: string, hours: number): Date {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new HttpError(400, 'startTime must be a valid ISO timestamp');
  }
  return new Date(d.getTime() + hours * 60 * 60 * 1000);
}

function toQuoteSummary(q: QuoteRow): QuoteSummary {
  return {
    id: q.id,
    title: q.title,
    customerName: q.customerName,
    address: q.address,
    status: q.status,
  };
}

function toJob(j: JobRow, q: QuoteRow): Job {
  return {
    id: j.id,
    quoteId: j.quoteId,
    technicianId: j.technicianId,
    managerId: j.managerId,
    startTime: j.startTime.toISOString(),
    endTime: j.endTime.toISOString(),
    status: j.status,
    quote: toQuoteSummary(q),
  };
}

function isExclusionViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === '23P01'
  );
}

function notificationMessage(
  type: NotificationType,
  startTime: Date,
): string {
  const when = startTime.toISOString();
  switch (type) {
    case 'job_assigned':
      return `New job assigned starting ${when}`;
    case 'job_rescheduled':
      return `Job rescheduled to ${when}`;
    case 'job_cancelled':
      return `Job cancelled (was ${when})`;
    case 'job_completed':
      return `Job completed (was ${when})`;
  }
}

async function assertRole(
  tx: AnyDb,
  userId: string,
  expected: Role,
  errMsg: string,
): Promise<void> {
  const rows = await tx
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!rows[0] || rows[0].role !== expected) {
    throw new HttpError(400, errMsg);
  }
}

export function createJobAssignmentService(db: AnyDb): JobAssignmentService {
  async function findOverlap(
    tx: AnyDb,
    technicianId: string,
    startTime: Date,
    endTime: Date,
    excludeJobId?: string,
  ): Promise<boolean> {
    const result = await tx.execute<{ id: string }>(sql`
      SELECT id FROM jobs
      WHERE technician_id = ${technicianId}
        AND tstzrange(start_time, end_time) && tstzrange(${startTime.toISOString()}::timestamptz, ${endTime.toISOString()}::timestamptz)
        ${excludeJobId ? sql`AND id <> ${excludeJobId}` : sql``}
      LIMIT 1
    `);
    return result.rows.length > 0;
  }

  async function loadJobWithQuote(
    tx: AnyDb,
    jobId: string,
  ): Promise<{ job: JobRow; quote: QuoteRow } | null> {
    const rows = await tx
      .select({ job: jobs, quote: quotes })
      .from(jobs)
      .innerJoin(quotes, eq(jobs.quoteId, quotes.id))
      .where(eq(jobs.id, jobId))
      .limit(1);
    return rows[0] ?? null;
  }

  return {
    async createJob({ managerId, quoteId, technicianId, startTime }) {
      const start = new Date(startTime);
      if (Number.isNaN(start.getTime())) {
        throw new HttpError(400, 'startTime must be a valid ISO timestamp');
      }
      const end = addHours(startTime, JOB_DURATION_HOURS);

      try {
        return await db.transaction(async (tx) => {
          await assertRole(
            tx as AnyDb,
            technicianId,
            'technician',
            'technicianId does not refer to a technician',
          );
          await assertRole(
            tx as AnyDb,
            managerId,
            'manager',
            'managerId does not refer to a manager',
          );

          if (await findOverlap(tx as AnyDb, technicianId, start, end)) {
            throw new HttpError(
              409,
              'Technician already booked for an overlapping window',
            );
          }

          const inserted = await tx
            .insert(jobs)
            .values({
              quoteId,
              technicianId,
              managerId,
              startTime: start,
              endTime: end,
            })
            .returning();
          const jobRow = inserted[0];

          await tx.insert(notifications).values({
            recipientUserId: technicianId,
            jobId: jobRow.id,
            type: 'job_assigned',
            message: notificationMessage('job_assigned', start),
          });

          const updatedQuote = await tx
            .update(quotes)
            .set({ status: 'scheduled', updatedAt: new Date() })
            .where(eq(quotes.id, quoteId))
            .returning();

          return toJob(jobRow, updatedQuote[0]);
        });
      } catch (err) {
        if (isExclusionViolation(err)) {
          throw new HttpError(
            409,
            'Technician already booked for an overlapping window',
          );
        }
        throw err;
      }
    },

    async listJobs({ technicianId }) {
      const rows = await db
        .select({ job: jobs, quote: quotes })
        .from(jobs)
        .innerJoin(quotes, eq(jobs.quoteId, quotes.id))
        .where(eq(jobs.technicianId, technicianId))
        .orderBy(jobs.startTime);
      return rows.map((r) => toJob(r.job, r.quote));
    },

    async patchJob({ jobId, actor, patch }) {
      try {
        return await db.transaction(async (tx) => {
          const current = await loadJobWithQuote(tx as AnyDb, jobId);
          if (!current) {
            throw new HttpError(404, 'Job not found');
          }
          const { job, quote } = current;

          if (actor.role === 'technician') {
            if (job.technicianId !== actor.userId) {
              throw new HttpError(403, 'Forbidden');
            }
            if (
              patch.startTime !== undefined ||
              patch.technicianId !== undefined
            ) {
              throw new HttpError(
                403,
                'Technicians can only update job status to completed',
              );
            }
            if (patch.status !== 'completed') {
              throw new HttpError(
                400,
                'Technicians can only set status to completed',
              );
            }

            const updated = await tx
              .update(jobs)
              .set({ status: 'completed', updatedAt: new Date() })
              .where(eq(jobs.id, jobId))
              .returning();
            const updatedQuote = await tx
              .update(quotes)
              .set({ status: 'completed', updatedAt: new Date() })
              .where(eq(quotes.id, job.quoteId))
              .returning();

            await tx.insert(notifications).values({
              recipientUserId: job.managerId,
              jobId: job.id,
              type: 'job_completed',
              message: notificationMessage('job_completed', job.startTime),
            });

            return toJob(updated[0], updatedQuote[0]);
          }

          // manager path
          const newTechnicianId = patch.technicianId ?? job.technicianId;
          const newStartTime = patch.startTime
            ? new Date(patch.startTime)
            : job.startTime;
          const newEndTime = patch.startTime
            ? addHours(patch.startTime, JOB_DURATION_HOURS)
            : job.endTime;

          if (patch.technicianId !== undefined) {
            await assertRole(
              tx as AnyDb,
              patch.technicianId,
              'technician',
              'technicianId does not refer to a technician',
            );
          }

          const rescheduling =
            patch.startTime !== undefined || patch.technicianId !== undefined;

          if (rescheduling) {
            if (
              await findOverlap(
                tx as AnyDb,
                newTechnicianId,
                newStartTime,
                newEndTime,
                job.id,
              )
            ) {
              throw new HttpError(
                409,
                'Technician already booked for an overlapping window',
              );
            }
          }

          const updateValues: Partial<typeof jobs.$inferInsert> = {
            updatedAt: new Date(),
          };
          if (patch.startTime !== undefined) {
            updateValues.startTime = newStartTime;
            updateValues.endTime = newEndTime;
          }
          if (patch.technicianId !== undefined) {
            updateValues.technicianId = patch.technicianId;
          }
          if (patch.status !== undefined) {
            updateValues.status = patch.status;
          }

          const updated = await tx
            .update(jobs)
            .set(updateValues)
            .where(eq(jobs.id, jobId))
            .returning();

          if (rescheduling) {
            await tx.insert(notifications).values({
              recipientUserId: newTechnicianId,
              jobId: job.id,
              type: 'job_rescheduled',
              message: notificationMessage('job_rescheduled', newStartTime),
            });
          }

          return toJob(updated[0], quote);
        });
      } catch (err) {
        if (isExclusionViolation(err)) {
          throw new HttpError(
            409,
            'Technician already booked for an overlapping window',
          );
        }
        throw err;
      }
    },
  };
}

