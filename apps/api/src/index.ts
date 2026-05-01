import './db/env.js';
import { eq } from 'drizzle-orm';
import { createApp } from './app.js';
import type { AuthDeps, UserRecord } from './app.js';
import { db } from './db/client.js';
import { users } from './db/schema.js';
import { createJobAssignmentService } from './services/jobAssignment.js';

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
const app = createApp(deps, jobsService);

app.listen(port, () => {
  console.log(`api listening on http://localhost:${port}`);
});
