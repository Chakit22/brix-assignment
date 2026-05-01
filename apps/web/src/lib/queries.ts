import { useEffect, useState } from 'react';
import type { PublicUser, Quote } from '@brix/shared';
import { apiClient } from './api';

export type QueryState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

function useResource<T>(path: string): QueryState<T> {
  const [state, setState] = useState<QueryState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ data: null, loading: true, error: null });
    apiClient
      .get<T>(path)
      .then((data) => {
        if (cancelled) return;
        setState({ data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          data: null,
          loading: false,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return state;
}

export function useTechnicians(): QueryState<PublicUser[]> {
  return useResource<PublicUser[]>('/users?role=technician');
}

export function useUnscheduledQuotes(): QueryState<Quote[]> {
  return useResource<Quote[]>('/quotes?status=unscheduled');
}
