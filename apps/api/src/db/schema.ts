import { sql } from 'drizzle-orm';
import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['manager', 'technician']);
export const quoteStatusEnum = pgEnum('quote_status', [
  'unscheduled',
  'scheduled',
  'completed',
  'cancelled',
]);
export const jobStatusEnum = pgEnum('job_status', [
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
]);
export const notificationTypeEnum = pgEnum('notification_type', [
  'job_assigned',
  'job_rescheduled',
  'job_cancelled',
  'job_completed',
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: userRoleEnum('role').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const quotes = pgTable('quotes', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  title: text('title').notNull(),
  description: text('description'),
  customerName: text('customer_name').notNull(),
  address: text('address').notNull(),
  status: quoteStatusEnum('status').notNull().default('unscheduled'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  quoteId: uuid('quote_id')
    .notNull()
    .unique()
    .references(() => quotes.id, { onDelete: 'restrict' }),
  technicianId: uuid('technician_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  managerId: uuid('manager_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  status: jobStatusEnum('status').notNull().default('scheduled'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  recipientUserId: uuid('recipient_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id')
    .notNull()
    .references(() => jobs.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum('type').notNull(),
  message: text('message').notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
