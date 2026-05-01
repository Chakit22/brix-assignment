import type { HealthStatus } from '@brix/shared';

export function App(): JSX.Element {
  const placeholder: HealthStatus = { status: 'ok' };
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <h1>Brix</h1>
      <p>scaffold ready ({placeholder.status})</p>
    </main>
  );
}
