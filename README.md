# Brix Assignment — Service Scheduling & Notification System

A small full-stack app where managers assign quotes to technicians inside fixed
two-hour windows and technicians work through their schedule. Conflict
prevention is enforced at both the application and database layers, and
notifications are delivered through DB-backed polling so the demo works without
any websocket infrastructure.

## Live URLs

| | URL | Notes |
| --- | --- | --- |
| Web (Vercel) | https://brix-web-smoky.vercel.app | React app — start here |
| API (Render) | https://brix-api.onrender.com | `GET /health` returns `{ "status": "ok" }` |

> Render's free tier sleeps the API after ~15 min of inactivity. The first request after a cold start can take ~30s while the dyno wakes up.

### Demo credentials

All seeded users share a single password sent privately to the reviewer.

| Role | Email |
| --- | --- |
| Manager | `manager1@brix.local` |
| Manager | `manager2@brix.local` |
| Technician | `tech1@brix.local` |
| Technician | `tech2@brix.local` |
| Technician | `tech3@brix.local` |

## End-to-end demo

1. Sign in as `manager1@brix.local`. Open the dashboard and pick an
   unscheduled quote.
2. Assign it to `tech1@brix.local` in any free 2-hour slot. The job appears in
   the manager's calendar.
3. Sign out, then sign in as `tech1@brix.local`. The newly assigned job is in
   the schedule, and the bell shows an unread `job_assigned` notification.
4. Mark the job completed. Sign back in as `manager1@brix.local` and the bell
   shows a `job_completed` notification.

## Architecture

```
+-----------------------+        +-------------------------+
|  apps/web (Vercel)    |        |  apps/api (Render)      |
|  React 18 + Vite      |  --->  |  Express + Drizzle ORM  |
|  React Router v6      |  HTTPS |  JWT (HS256) + bcrypt   |
+-----------------------+        +-----------+-------------+
                                             |
                                             v
                                   +---------+--------------+
                                   |  Postgres 16 (Render)  |
                                   |  btree_gist + uuid-ossp|
                                   +------------------------+
```

### Entity diagram

```
users(id, email, password_hash, name, role)
  | role ∈ {manager, technician}
  |
  +----< jobs.manager_id
  +----< jobs.technician_id
  +----< notifications.recipient_user_id

quotes(id, title, customer_name, address, status)
  | status ∈ {unscheduled, scheduled, completed, cancelled}
  |
  +----< jobs.quote_id  (UNIQUE — one job per quote)

jobs(id, quote_id, technician_id, manager_id,
     start_time, end_time, status,
     EXCLUDE USING gist (technician_id WITH =,
                         tstzrange(start_time, end_time) WITH &&))

notifications(id, recipient_user_id, job_id, type, message,
              read_at, created_at)
  type ∈ {job_assigned, job_rescheduled, job_cancelled, job_completed}
```

### Repository layout

```
apps/
  api/    Express + Drizzle service deployed to Render
  web/    Vite + React SPA deployed to Vercel
packages/
  shared/ TypeScript types shared between api and web
render.yaml      Blueprint for the Render API + Postgres
apps/web/vercel.json  Vite framework + SPA rewrite for Vercel
```

## Conflict handling

Two layers, intentionally redundant.

**1. Transactional pre-check (application).** `createJobAssignmentService` runs
the conflict query and the insert in the same Postgres transaction. The
pre-check produces a friendly `409 Conflict` with the offending job ids before
the constraint fires.

**2. Postgres exclusion constraint (database).** The `jobs` table carries:

```sql
EXCLUDE USING gist (
  technician_id WITH =,
  tstzrange(start_time, end_time) WITH &&
)
```

The constraint is the source of truth. If two managers race a booking for the
same technician on the same window, one transaction commits, the other fails
with SQLSTATE `23P01`. The error handler translates `23P01` into HTTP `409
Conflict` so clients see the same response shape regardless of which layer
caught the conflict.

The combination is "belt-and-suspenders": the pre-check keeps the happy path
fast and produces a useful payload; the constraint guarantees correctness even
under concurrent writes.

## Notification design

- **DB-backed.** Every job mutation writes the relevant `notifications` rows
  in the same transaction as the job change. If the job write rolls back, the
  notification rows roll back with it — there is no partial state where a job
  exists without its notification or vice versa.
- **Polling delivery.** The web app polls `GET /notifications` every 10
  seconds. The endpoint returns the list plus an `unreadCount` so the bell
  badge updates without a separate request. `PATCH /notifications/:id/read`
  marks a single notification read.
- **No real-time push.** The spec explicitly allows simulated delivery; this
  satisfies it without bringing in websockets, SSE, or a queue.

## Trade-offs

- **Polling over websockets.** A 10-second poll is simple, survives connection
  flaps, and works on Vercel/Render without long-lived connections. The
  obvious cost is up-to-10s notification latency and constant background
  traffic. WebSockets/SSE would be the next step.
- **Seed-only users.** No public signup; users come exclusively from the seed
  script. Keeps the demo predictable and avoids password-reset / email
  scaffolding.
- **Fixed 2-hour windows.** Encoded in the API and UI. Variable durations
  would require richer pickers and conflict math, neither of which the spec
  asks for.
- **No timezone UI.** Server stores UTC, browser renders in the user's local
  zone. Explicit per-user timezones would matter for a real production
  scheduler.
- **Single-region Postgres.** Render free Postgres is fine for a take-home
  but obviously not for a production scheduler with strict latency targets.

## What I'd do next

- WebSocket / SSE push so the bell updates in real time.
- Drag-to-reschedule on the manager calendar (writes go through the same
  conflict-aware endpoint).
- Multi-technician unified calendar so a manager can see availability across
  the whole team at a glance.
- `SERIALIZABLE` isolation on the assignment transaction. The current
  `READ COMMITTED` + EXCLUDE constraint is correct, but `SERIALIZABLE` would
  make the application-level pre-check robust against phantom reads without
  relying on the constraint to catch the race.
- E2E tests (Playwright) hitting the deployed environments instead of just
  unit + supertest.

## Local setup

```bash
# 1. Postgres in Docker (loads btree_gist + uuid-ossp via init scripts)
docker compose up -d

# 2. Install workspaces
npm install

# 3. Run migrations + seed
npm run db:migrate --workspace=apps/api
npm run db:seed    --workspace=apps/api

# 4. Start both apps (api on :3001, web on :5173)
npm run dev
```

`apps/api/.env`:

```
DATABASE_URL=postgres://brix:brix@localhost:5432/brix
JWT_SECRET=change-me-in-production
PORT=3001
```

`apps/web/.env`:

```
VITE_API_URL=http://localhost:3001
```

## Deployment

### API on Render (Blueprint)

The repo ships a `render.yaml` blueprint. Pointing Render at the repo creates
a `brix-api` web service and a `brix-postgres` database with the right env
wiring.

- Build: `npm ci && npm run build --workspace=apps/api`
- Pre-deploy: `npm run db:migrate --workspace=apps/api && npm run db:seed --workspace=apps/api`
- Start: `node apps/api/dist/index.js`
- Health check: `GET /health`

`DATABASE_URL` is injected from the linked database. `JWT_SECRET` is generated
once. `CORS_ORIGIN` must be set to the Vercel URL (it is `sync: false` so
Render does not overwrite the dashboard value).

The migrate script runs `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"` and
`btree_gist` before applying migrations, so a fresh Render Postgres bootstraps
without manual SQL. The seed is idempotent — it skips when users already
exist, which makes it safe as a `preDeployCommand`.

### Web on Vercel

- Project root: `apps/web`
- Framework preset: Vite (auto-detected)
- Production env: `VITE_API_URL=<Render API URL>`
- `apps/web/vercel.json` adds the SPA rewrite so React Router deep links work
  on hard refresh.

After both projects exist, set `CORS_ORIGIN` on the Render service to the
Vercel domain (and any preview domains you want to allow, comma-separated).

## Use of AI tools

This project was built with Claude Code (Anthropic) as a pair-programming
assistant. The workflow:

- I broke the spec into 12 small Linear issues (PER-3 through PER-14), each
  with concrete acceptance criteria.
- Each issue ran in its own git worktree via the `/resolve` slash command,
  which drives a TDD loop and opens a PR.
- I reviewed every PR before merging; conflict resolution between parallel
  branches (`app.ts` router mounts, `package-lock.json`) was done by hand.
- The conflict-prevention design (transactional pre-check + Postgres EXCLUDE
  + `23P01` → `409` translation) and the polling-over-websockets call were
  decisions I made up-front before any code was generated; the agent
  implemented to those constraints.

The "Conflict handling" and "Trade-offs" sections above are the explicit
answers to the spec's "explain your implementation, conflict handling, and
trade-offs" requirement.

## Tests

```bash
npm test            # all workspaces
npm run lint        # tsc --noEmit everywhere
```

API has unit and supertest coverage of auth, jobs, notifications, conflict
handling, and the new CORS + extension layers. Web has React Testing Library
coverage of the auth shell, manager dashboard, and technician schedule. DB
integration tests are skipped unless `INTEGRATION=1` is set (they need a real
Postgres).
