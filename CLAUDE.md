# Brix Assignment — Project Guidelines

Service Scheduling & Notification System take-home. Monorepo with `apps/api` (Express + Drizzle + Postgres), `apps/web` (Vite + React + Tailwind), `packages/shared` (TS types).

## Linear Workspace

- **Team**: Personal (key: `PER`)
- **Project**: Brix Assignment (id: `90c39536-08cc-4e11-8fbc-09160ab9c8cb`)
- **GitHub repo**: `Chakit22/brix-assignment`
- **Branch prefix**: `chakitbhandari22/`
- **Issue prefix**: `PER-`
- **Default base branch**: `main`

## Tech Stack

- TypeScript everywhere
- Backend: Node.js 24, Express, Drizzle ORM, PostgreSQL 16, JWT auth (bcrypt)
- Frontend: React 18, Vite, React Router v6, Tailwind CSS
- Local dev DB: Docker Compose (Postgres 16 + `btree_gist` extension)
- Hosting: Vercel (`apps/web`), Render (`apps/api` + Postgres)

## Design System

- **Palette**: purple + black. Define Tailwind tokens for `bg.canvas`, `bg.surface`, `accent.purple.{50..900}`.
- **Always use the `frontend-design` skill** when building or modifying UI in `apps/web/`. Avoid generic AI aesthetics.

## Conventions

- 2-space indent, async/await over callbacks, trailing commas in multi-line literals
- Conventional commit messages (`feat:`, `fix:`, `docs:`, `chore:`)
- One PR per Linear issue; PR title format: `PER-N: <issue title>`
- Branch naming: `chakitbhandari22/per-N-<slug>` (matches Linear's `gitBranchName`)

## Domain Rules

- Jobs are fixed 2-hour windows. `end_time = start_time + 2 hours`.
- Conflict = any overlap on the same `technician_id`. Enforced **both** in app code (transactional pre-check) **and** at DB level (`EXCLUDE USING gist (technician_id WITH =, tstzrange(start_time, end_time) WITH &&)`).
- DB exclusion violation `23P01` must be translated to HTTP `409 Conflict`.
- Notifications are mocked: written as DB rows in the same transaction as the job change. No real-time delivery — frontend polls `GET /notifications` every 10s.
- Two roles: `manager` and `technician`. Single `users` table with a `role` enum. JWT carries `{ userId, role }`.
- No public signup. Users come from the seed script only.

## Local Setup

```bash
docker compose up -d
npm install
npm run db:migrate --workspace=apps/api
npm run db:seed --workspace=apps/api
npm run dev
```

## Workflow

- One worktree per Linear issue: `../brix-NN-slug`
- Run `/resolve PER-N` inside the worktree → opens PR → posts status to Linear
- Run `/review-pr` before merging
- After merge, in any still-open worktree: `git fetch origin && git rebase origin/main`

## Out of Scope (documented as future work)

- WebSocket / SSE push (polling is the spec-compliant simulation)
- Public signup, password reset, refresh tokens
- Drag-to-reschedule, multi-technician unified calendar
- Timezone UI (server stores UTC, browser renders local)
