import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useNotifications, POLL_INTERVAL_MS } from './useNotifications';
import { apiClient } from './api';

const ORIGINAL_FETCH = globalThis.fetch;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function makeNotification(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'n1',
    recipientUserId: 'u1',
    jobId: 'j1',
    type: 'job_assigned' as const,
    message: 'Job assigned: HVAC',
    readAt: null,
    createdAt: '2026-05-01T09:00:00.000Z',
    ...overrides,
  };
}

describe('useNotifications', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    apiClient.setToken('test-token');
  });

  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
    apiClient.setToken(null);
    vi.useRealTimers();
  });

  it('fetches /notifications on mount and exposes data + unreadCount', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        notifications: [makeNotification()],
        unreadCount: 1,
      }),
    );

    const { result } = renderHook(() => useNotifications({ enabled: true }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.unreadCount).toBe(1);
    expect(String(fetchMock.mock.calls[0]![0])).toContain('/notifications');
  });

  it('does not fetch when disabled (no auth token)', () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    const { result } = renderHook(() => useNotifications({ enabled: false }));
    expect(result.current.loading).toBe(false);
    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('polls every POLL_INTERVAL_MS while mounted', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({ notifications: [], unreadCount: 0 })),
    );

    const { unmount } = renderHook(() => useNotifications({ enabled: true }));

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);

    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 2);
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('markRead posts to /notifications/:id/read and updates state optimistically', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    const initial = makeNotification({ id: 'n-unread', readAt: null });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ notifications: [initial], unreadCount: 1 }),
    );

    const { result } = renderHook(() => useNotifications({ enabled: true }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        notification: { ...initial, readAt: '2026-05-01T09:05:00.000Z' },
      }),
    );

    await act(async () => {
      await result.current.markRead('n-unread');
    });

    const calls = fetchMock.mock.calls;
    const postCall = calls.find(
      ([url, init]) =>
        String(url).includes('/notifications/n-unread/read') &&
        (init as RequestInit | undefined)?.method === 'POST',
    );
    expect(postCall).toBeDefined();
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications[0]!.readAt).toBe(
      '2026-05-01T09:05:00.000Z',
    );
  });

  it('markAllRead fires a POST per unread notification only', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    const a = makeNotification({ id: 'a', readAt: null });
    const b = makeNotification({
      id: 'b',
      readAt: '2026-05-01T09:00:00.000Z',
    });
    const c = makeNotification({ id: 'c', readAt: null });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ notifications: [a, b, c], unreadCount: 2 }),
    );

    const { result } = renderHook(() => useNotifications({ enabled: true }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    fetchMock.mockImplementation((url) =>
      Promise.resolve(
        jsonResponse({
          notification: {
            ...makeNotification({
              id: String(url).split('/notifications/')[1]!.split('/')[0],
              readAt: '2026-05-01T09:10:00.000Z',
            }),
          },
        }),
      ),
    );

    await act(async () => {
      await result.current.markAllRead();
    });

    const postPaths = fetchMock.mock.calls
      .filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST')
      .map(([url]) => String(url));
    expect(postPaths.some((p) => p.includes('/notifications/a/read'))).toBe(true);
    expect(postPaths.some((p) => p.includes('/notifications/c/read'))).toBe(true);
    expect(postPaths.some((p) => p.includes('/notifications/b/read'))).toBe(false);
    expect(result.current.unreadCount).toBe(0);
  });
});
