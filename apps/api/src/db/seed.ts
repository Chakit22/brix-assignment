import './env.js';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { notifications, jobs, quotes, users } from './schema.js';

// Demo credentials (DO NOT use in production):
//   manager1@brix.local / password123
//   manager2@brix.local / password123
//   tech1@brix.local    / password123
//   tech2@brix.local    / password123
//   tech3@brix.local    / password123

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set.');
}

const pool = new Pool({ connectionString });
const db = drizzle(pool);

const password = 'password123';
const passwordHash = await bcrypt.hash(password, 10);

await db.execute(
  sql`TRUNCATE TABLE ${notifications}, ${jobs}, ${quotes}, ${users} RESTART IDENTITY CASCADE`,
);

await db.insert(users).values([
  { email: 'manager1@brix.local', name: 'Maya Manager', role: 'manager', passwordHash },
  { email: 'manager2@brix.local', name: 'Marc Manager', role: 'manager', passwordHash },
  { email: 'tech1@brix.local', name: 'Tara Technician', role: 'technician', passwordHash },
  { email: 'tech2@brix.local', name: 'Theo Technician', role: 'technician', passwordHash },
  { email: 'tech3@brix.local', name: 'Tess Technician', role: 'technician', passwordHash },
]);

await db.insert(quotes).values([
  {
    title: 'Replace kitchen tap',
    description: 'Customer reports a slow drip.',
    customerName: 'Alex Roberts',
    address: '12 Carlton St, Carlton VIC 3053',
  },
  {
    title: 'AC service — annual',
    description: 'Two split units in main living area.',
    customerName: 'Priya Singh',
    address: '88 Glen Eira Rd, Caulfield VIC 3162',
  },
  {
    title: 'Hot water unit replacement',
    description: 'Existing unit out of warranty, leaking.',
    customerName: 'Daniel Kim',
    address: '5/41 Rae St, Fitzroy North VIC 3068',
  },
  {
    title: 'Bathroom exhaust fan install',
    description: 'New build extension, ducted to roof.',
    customerName: 'Jules Anderson',
    address: '233 Smith St, Collingwood VIC 3066',
  },
  {
    title: 'Solar inverter inspection',
    description: 'Intermittent output drop reported.',
    customerName: 'Mei Tan',
    address: '7 Walpole St, Kew VIC 3101',
  },
]);

console.log('seed complete: 5 users, 5 quotes');
await pool.end();
