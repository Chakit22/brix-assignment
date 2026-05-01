import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

describeIfDb('jobs no-overlap exclusion constraint', () => {
  let client: Client;
  let managerId: string;
  let technicianId: string;
  let quoteIdA: string;
  let quoteIdB: string;

  beforeAll(async () => {
    client = new Client({ connectionString: DATABASE_URL });
    await client.connect();

    const mgr = await client.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, 'manager')
       RETURNING id`,
      [`exclude-mgr-${Date.now()}@test.local`, 'x', 'Test Mgr'],
    );
    managerId = mgr.rows[0].id;

    const tech = await client.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, 'technician')
       RETURNING id`,
      [`exclude-tech-${Date.now()}@test.local`, 'x', 'Test Tech'],
    );
    technicianId = tech.rows[0].id;

    const qa = await client.query<{ id: string }>(
      `INSERT INTO quotes (title, customer_name, address)
       VALUES ('A', 'Cust A', '1 St') RETURNING id`,
    );
    quoteIdA = qa.rows[0].id;
    const qb = await client.query<{ id: string }>(
      `INSERT INTO quotes (title, customer_name, address)
       VALUES ('B', 'Cust B', '2 St') RETURNING id`,
    );
    quoteIdB = qb.rows[0].id;
  });

  afterAll(async () => {
    if (client) await client.end();
  });

  it('rejects overlapping jobs on same technician with code 23P01', async () => {
    const start = '2026-06-01T09:00:00Z';
    const end = '2026-06-01T11:00:00Z';
    const overlapStart = '2026-06-01T10:00:00Z';
    const overlapEnd = '2026-06-01T12:00:00Z';

    await client.query(
      `INSERT INTO jobs (quote_id, technician_id, manager_id, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5)`,
      [quoteIdA, technicianId, managerId, start, end],
    );

    await expect(
      client.query(
        `INSERT INTO jobs (quote_id, technician_id, manager_id, start_time, end_time)
         VALUES ($1, $2, $3, $4, $5)`,
        [quoteIdB, technicianId, managerId, overlapStart, overlapEnd],
      ),
    ).rejects.toMatchObject({ code: '23P01' });
  });
});
