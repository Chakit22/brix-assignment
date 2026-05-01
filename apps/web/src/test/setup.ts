import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { apiClient } from '../lib/api';

beforeEach(() => {
  window.localStorage.clear();
  apiClient.setToken(null);
  apiClient.setOnUnauthorized(undefined);
});

afterEach(() => {
  cleanup();
});
