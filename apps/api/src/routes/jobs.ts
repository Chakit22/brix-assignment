import { Router } from 'express';
import type {
  CreateJobRequest,
  Job,
  JobResponse,
  JobsListResponse,
  PatchJobRequest,
  Role,
} from '@brix/shared';
import { HttpError } from '../middleware/errorHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export type JobsDeps = {
  createJob: (input: {
    managerId: string;
    quoteId: string;
    technicianId: string;
    startTime: string;
  }) => Promise<Job>;
  listJobs: (input: { technicianId: string }) => Promise<Job[]>;
  patchJob: (input: {
    jobId: string;
    actor: { userId: string; role: Role };
    patch: PatchJobRequest;
  }) => Promise<Job>;
};

function isUuid(s: unknown): s is string {
  return (
    typeof s === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
  );
}

function isIsoTimestamp(s: unknown): s is string {
  return typeof s === 'string' && !Number.isNaN(new Date(s).getTime());
}

export function createJobsRouter(deps: JobsDeps): Router {
  const router = Router();

  router.post(
    '/',
    requireAuth,
    requireRole('manager'),
    async (req, res, next) => {
      try {
        const body = (req.body ?? {}) as Partial<CreateJobRequest>;
        if (
          !isUuid(body.quoteId) ||
          !isUuid(body.technicianId) ||
          !isIsoTimestamp(body.startTime)
        ) {
          throw new HttpError(
            400,
            'quoteId, technicianId and startTime are required',
          );
        }
        const managerId = req.user!.userId;
        const job = await deps.createJob({
          managerId,
          quoteId: body.quoteId,
          technicianId: body.technicianId,
          startTime: body.startTime,
        });
        const out: JobResponse = { job };
        res.status(201).json(out);
      } catch (err) {
        next(err);
      }
    },
  );

  router.get('/', requireAuth, async (req, res, next) => {
    try {
      const technicianId = req.query.technicianId;
      if (!isUuid(technicianId)) {
        throw new HttpError(400, 'technicianId query param is required');
      }
      const actor = req.user!;
      if (actor.role === 'technician' && actor.userId !== technicianId) {
        throw new HttpError(403, 'Technicians can only list their own jobs');
      }
      const jobs = await deps.listJobs({ technicianId });
      const out: JobsListResponse = { jobs };
      res.status(200).json(out);
    } catch (err) {
      next(err);
    }
  });

  router.patch('/:id', requireAuth, async (req, res, next) => {
    try {
      const jobId = req.params.id;
      if (!isUuid(jobId)) {
        throw new HttpError(400, 'invalid job id');
      }
      const body = (req.body ?? {}) as Partial<PatchJobRequest>;
      const actor = req.user!;

      if (actor.role === 'technician') {
        if (
          body.startTime !== undefined ||
          body.technicianId !== undefined ||
          body.status !== 'completed'
        ) {
          throw new HttpError(
            403,
            'Technicians can only mark their own job as completed',
          );
        }
      } else {
        if (body.startTime !== undefined && !isIsoTimestamp(body.startTime)) {
          throw new HttpError(400, 'startTime must be a valid ISO timestamp');
        }
        if (
          body.technicianId !== undefined &&
          !isUuid(body.technicianId)
        ) {
          throw new HttpError(400, 'technicianId must be a uuid');
        }
        if (
          body.startTime === undefined &&
          body.technicianId === undefined &&
          body.status === undefined
        ) {
          throw new HttpError(400, 'no fields to update');
        }
      }

      const patch: PatchJobRequest = {};
      if (body.startTime !== undefined) patch.startTime = body.startTime;
      if (body.technicianId !== undefined)
        patch.technicianId = body.technicianId;
      if (body.status !== undefined) patch.status = body.status;

      const job = await deps.patchJob({
        jobId,
        actor: { userId: actor.userId, role: actor.role },
        patch,
      });
      const out: JobResponse = { job };
      res.status(200).json(out);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
