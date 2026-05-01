-- Add 'job_completed' to the notification_type enum so technicians can notify
-- the manager when they finish a job.
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'job_completed';
