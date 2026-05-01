import type { HealthStatus } from '@brix/shared';

const initialStatus: HealthStatus['status'] = 'ok';

export function App(): JSX.Element {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <h1>Brix</h1>
      <p>scaffold ready ({initialStatus})</p>
    </main>
  );
}
