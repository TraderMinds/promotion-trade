import { describe, it, expect } from 'vitest';
import { invoke } from './env.js';

describe('Health endpoint', () => {
  it('returns ok status', async () => {
    const res = await invoke('/api/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
    expect(body.data.kv).toBe('reachable');
  });
});
