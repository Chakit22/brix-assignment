import { describe, it, expect } from 'vitest';
import { getTableColumns } from 'drizzle-orm';
import {
  users,
  quotes,
  jobs,
  notifications,
  userRoleEnum,
  quoteStatusEnum,
  jobStatusEnum,
  notificationTypeEnum,
} from './schema.js';

describe('schema exports', () => {
  it('users has expected columns', () => {
    const cols = Object.keys(getTableColumns(users)).sort();
    expect(cols).toEqual(
      ['id', 'email', 'passwordHash', 'name', 'role', 'createdAt'].sort(),
    );
  });

  it('quotes has expected columns', () => {
    const cols = Object.keys(getTableColumns(quotes)).sort();
    expect(cols).toEqual(
      [
        'id',
        'title',
        'description',
        'customerName',
        'address',
        'status',
        'createdAt',
        'updatedAt',
      ].sort(),
    );
  });

  it('jobs has expected columns', () => {
    const cols = Object.keys(getTableColumns(jobs)).sort();
    expect(cols).toEqual(
      [
        'id',
        'quoteId',
        'technicianId',
        'managerId',
        'startTime',
        'endTime',
        'status',
        'createdAt',
        'updatedAt',
      ].sort(),
    );
  });

  it('notifications has expected columns', () => {
    const cols = Object.keys(getTableColumns(notifications)).sort();
    expect(cols).toEqual(
      [
        'id',
        'recipientUserId',
        'jobId',
        'type',
        'message',
        'readAt',
        'createdAt',
      ].sort(),
    );
  });

  it('enums have expected values', () => {
    expect(userRoleEnum.enumValues).toEqual(['manager', 'technician']);
    expect(quoteStatusEnum.enumValues).toEqual([
      'unscheduled',
      'scheduled',
      'completed',
      'cancelled',
    ]);
    expect(jobStatusEnum.enumValues).toEqual([
      'scheduled',
      'in_progress',
      'completed',
      'cancelled',
    ]);
    expect(notificationTypeEnum.enumValues).toEqual([
      'job_assigned',
      'job_rescheduled',
      'job_cancelled',
    ]);
  });
});
