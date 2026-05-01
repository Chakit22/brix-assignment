import './env.js';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { ensureExtensions } from './extensions.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set.');
}

const here = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(here, 'migrations');

const pool = new Pool({ connectionString });
const db = drizzle(pool);

await ensureExtensions(pool);
await migrate(db, { migrationsFolder });
await pool.end();

console.log('migrations applied');
