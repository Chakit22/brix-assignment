import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../app.js';
import type { AuthDeps, UserRecord, JobsDeps } from '../app.js';
import type { Job, LoginResponse } from '@brix/shared';
import { HttpError } from '../middleware/errorHandler.js';

const password = 'password123';

const managerId = '11111111-1111-1111-1111-111111111111';
const otherManagerId = '22222222-2222-2222-2222-222222222222';
const techAId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const techBId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const quoteId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const jobId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

async function makeAuthDeps(): Promise<AuthDeps> {
  const passwordHash = await bcrypt.hash(password, 4);
  const manager: UserRecord = {
    id: managerId,
    email: 'mgr@brix.local',
    name: 'Maya',
    role: 'manager',
    passwordHash,
  };
  const otherMgr: UserRecord = {
    id: otherManagerId,
    email: 'mgr2@brix.local',
    name: 'Marc',
    role: 'manager',
    passwordHash,
  };
  const techA: UserRecord = {
    id: techAId,
    email: 'techa@brix.local',
    name: 'Tara',
    role: 'technician',
    passwordHash,
  };
  const techB: UserRecord = {
    id: techBId,
    email: 'techb@brix.local',
    name: 'Theo',
    role: 'technician',
    passwordHash,
  };
  const byEmail = new Map([
    [manager.email, manager],
    [otherMgr.email, otherMgr],
    [techA.email, techA],
    [techB.email, techB],
  ]);
  const byId = new Map([
    [manager.id, manager],
    [otherMgr.id, otherMgr],
    [techA.id, techA],
    [techB.id, techB],
  ]);
  return {
    findUserByEmail: async (email) => byEmail.get(email) ?? null,
    findUserById: async (id) => byId.get(id) ?? null,
  };
}

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: jobId,
    quoteId,
    technicianId: techAId,
    managerId,
    startTime: '2026-06-01T09:00:00.000Z',
    endTime: '2026-06-01T11:00:00.000Z',
    status: 'scheduled',
    quote: {
      id: quoteId,
      title: 'Replace tap',
      customerName: 'Alex',
      address: '12 Carlton St',
      status: 'scheduled',
    },
    ...overrides,
  };
}

function makeJobsDeps(): JobsDeps {
  return {
    createJob: vi.fn(),
    listJobs: vi.fn(),
    patchJob: vi.fn(),
  };
}

async function loginAs(app: ReturnType<typeof createApp>, email: string) {
  const res = await request(app)
    .post('/auth/login')
    .send({ email, password });
  return (res.body as LoginResponse).token;
}

describe('POST /jobs', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  it('returns 201 with job for valid manager request', async () => {
    const job = makeJob();
    const jobsDeps = makeJobsDeps();
    (jobsDeps.createJob as ReturnType<typeof vi.fn>).mockResolvedValue(job);

    const app = createApp(await makeAuthDeps(), jobsDeps);
    const token = await loginAs(app, 'mgr@brix.local');

    const res = await request(app)
      .post('/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        quoteId,
        technicianId: techAId,
        startTime: job.startTime,
      });

    expect(res.status).toBe(201);
    expect(res.body.job).toEqual(job);
    expect(jobsDeps.createJob).toHaveBeenCalledWith({
      managerId,
      quoteId,
      technicianId: techAId,
      startTime: job.startTime,
    });
  });

  it('returns 403 when called by a technician', async () => {
    const jobsDeps = makeJobsDeps();
    const app = createApp(await makeAuthDeps(), jobsDeps);
    const token = await loginAs(app, 'techa@brix.local');

    const res = await request(app)
      .post('/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        quoteId,
        technicianId: techAId,
        startTime: '2026-06-01T09:00:00.000Z',
      });

    expect(res.status).toBe(403);
    expect(jobsDeps.createJob).not.toHaveBeenCalled();
  });

  it('returns 401 without a token', async () => {
    const app = createApp(await makeAuthDeps(), makeJobsDeps());
    const res = await request(app).post('/jobs').send({});
    expect(res.status).toBe(401);
  });

  it('returns 400 on missing fields', async () => {
    const app = createApp(await makeAuthDeps(), makeJobsDeps());
    const token = await loginAs(app, 'mgr@brix.local');
    const res = await request(app)
      .post('/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ quoteId });
    expect(res.status).toBe(400);
  });

  it('translates 409 from service into 409 response', async () => {
    const jobsDeps = makeJobsDeps();
    (jobsDeps.createJob as ReturnType<typeof vi.fn>).mockRejectedValue(
      new HttpError(409, 'Technician already booked for this window'),
    );
    const app = createApp(await makeAuthDeps(), jobsDeps);
    const token = await loginAs(app, 'mgr@brix.local');

    const res = await request(app)
      .post('/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        quoteId,
        technicianId: techAId,
        startTime: '2026-06-01T09:00:00.000Z',
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/booked|conflict/i);
  });
});

describe('GET /jobs', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  it('manager can list any technician jobs', async () => {
    const jobsDeps = makeJobsDeps();
    (jobsDeps.listJobs as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeJob(),
    ]);
    const app = createApp(await makeAuthDeps(), jobsDeps);
    const token = await loginAs(app, 'mgr@brix.local');

    const res = await request(app)
      .get(`/jobs?technicianId=${techAId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.jobs).toHaveLength(1);
    expect(jobsDeps.listJobs).toHaveBeenCalledWith({
      technicianId: techAId,
    });
  });

  it('technician can list their own jobs', async () => {
    const jobsDeps = makeJobsDeps();
    (jobsDeps.listJobs as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const app = createApp(await makeAuthDeps(), jobsDeps);
    const token = await loginAs(app, 'techa@brix.local');

    const res = await request(app)
      .get(`/jobs?technicianId=${techAId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('technician cannot list other technician jobs', async () => {
    const jobsDeps = makeJobsDeps();
    const app = createApp(await makeAuthDeps(), jobsDeps);
    const token = await loginAs(app, 'techa@brix.local');

    const res = await request(app)
      .get(`/jobs?technicianId=${techBId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(jobsDeps.listJobs).not.toHaveBeenCalled();
  });
});

describe('PATCH /jobs/:id', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  it('manager can reschedule a job', async () => {
    const updated = makeJob({ startTime: '2026-06-02T09:00:00.000Z', endTime: '2026-06-02T11:00:00.000Z' });
    const jobsDeps = makeJobsDeps();
    (jobsDeps.patchJob as ReturnType<typeof vi.fn>).mockResolvedValue(updated);
    const app = createApp(await makeAuthDeps(), jobsDeps);
    const token = await loginAs(app, 'mgr@brix.local');

    const res = await request(app)
      .patch(`/jobs/${jobId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ startTime: '2026-06-02T09:00:00.000Z' });

    expect(res.status).toBe(200);
    expect(res.body.job.startTime).toBe('2026-06-02T09:00:00.000Z');
    expect(jobsDeps.patchJob).toHaveBeenCalledWith({
      jobId,
      actor: { userId: managerId, role: 'manager' },
      patch: { startTime: '2026-06-02T09:00:00.000Z' },
    });
  });

  it('manager reassign returns 409 when service throws conflict', async () => {
    const jobsDeps = makeJobsDeps();
    (jobsDeps.patchJob as ReturnType<typeof vi.fn>).mockRejectedValue(
      new HttpError(409, 'Technician already booked for this window'),
    );
    const app = createApp(await makeAuthDeps(), jobsDeps);
    const token = await loginAs(app, 'mgr@brix.local');

    const res = await request(app)
      .patch(`/jobs/${jobId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ technicianId: techBId });

    expect(res.status).toBe(409);
  });

  it('technician can complete their own job', async () => {
    const updated = makeJob({ status: 'completed' });
    const jobsDeps = makeJobsDeps();
    (jobsDeps.patchJob as ReturnType<typeof vi.fn>).mockResolvedValue(updated);
    const app = createApp(await makeAuthDeps(), jobsDeps);
    const token = await loginAs(app, 'techa@brix.local');

    const res = await request(app)
      .patch(`/jobs/${jobId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed' });

    expect(res.status).toBe(200);
    expect(res.body.job.status).toBe('completed');
    expect(jobsDeps.patchJob).toHaveBeenCalledWith({
      jobId,
      actor: { userId: techAId, role: 'technician' },
      patch: { status: 'completed' },
    });
  });

  it('technician cannot reschedule (only status: completed allowed)', async () => {
    const jobsDeps = makeJobsDeps();
    const app = createApp(await makeAuthDeps(), jobsDeps);
    const token = await loginAs(app, 'techa@brix.local');

    const res = await request(app)
      .patch(`/jobs/${jobId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ startTime: '2026-06-02T09:00:00.000Z' });

    expect(res.status).toBe(403);
    expect(jobsDeps.patchJob).not.toHaveBeenCalled();
  });

  it('returns 404 when service reports missing job', async () => {
    const jobsDeps = makeJobsDeps();
    (jobsDeps.patchJob as ReturnType<typeof vi.fn>).mockRejectedValue(
      new HttpError(404, 'Job not found'),
    );
    const app = createApp(await makeAuthDeps(), jobsDeps);
    const token = await loginAs(app, 'mgr@brix.local');

    const res = await request(app)
      .patch(`/jobs/${jobId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ startTime: '2026-06-02T09:00:00.000Z' });

    expect(res.status).toBe(404);
  });
});
