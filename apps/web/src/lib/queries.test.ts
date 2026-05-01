import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTechnicians, useUnscheduledQuotes, useMyJobs } from './queries';

const ORIGINAL_FETCH = globalThis.fetch;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('queries hooks', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });
  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  it('useTechnicians fetches /users?role=technician and returns data', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        { id: 't1', email: 'sam@x.io', name: 'Sam Patel', role: 'technician' },
      ]),
    );

    const { result } = renderHook(() => useTechnicians());
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([
      { id: 't1', email: 'sam@x.io', name: 'Sam Patel', role: 'technician' },
    ]);
    expect(result.current.error).toBeNull();

    const [url] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain('/users?role=technician');
  });

  it('useUnscheduledQuotes fetches /quotes?status=unscheduled and returns data', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        {
          id: 'q1',
          title: 'Replace HVAC unit',
          customerName: 'Alice Lin',
          address: '12 Smith St',
          status: 'unscheduled',
        },
      ]),
    );

    const { result } = renderHook(() => useUnscheduledQuotes());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.[0]?.id).toBe('q1');

    const [url] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain('/quotes?status=unscheduled');
  });

  it('useMyJobs fetches /jobs?technicianId=<userId> and unwraps jobs array', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        jobs: [
          {
            id: 'job1',
            quoteId: 'q1',
            technicianId: 'tech-uuid',
            managerId: 'm1',
            startTime: '2026-05-01T09:00:00.000Z',
            endTime: '2026-05-01T11:00:00.000Z',
            status: 'scheduled',
            quote: {
              id: 'q1',
              title: 'HVAC',
              customerName: 'Alice',
              address: '12 Smith St',
              status: 'scheduled',
            },
          },
        ],
      }),
    );

    const { result } = renderHook(() => useMyJobs('tech-uuid'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]?.id).toBe('job1');

    const [url] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain('/jobs?technicianId=tech-uuid');
  });

  it('useMyJobs does not fetch when userId is null', () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    const { result } = renderHook(() => useMyJobs(null));
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('exposes error when the request fails', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'boom' }, 500));

    const { result } = renderHook(() => useTechnicians());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).not.toBeNull();
    expect(result.current.data).toBeNull();
  });
});
