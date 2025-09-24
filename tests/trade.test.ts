import { describe, it, expect } from 'vitest';
import { invoke } from './env.js';

async function registerUser(id: number) {
  const res = await invoke('/api/user/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, firstName: 'Alice' })
  });
  return res;
}

describe('Trade flow', () => {
  it('registers and executes a trade', async () => {
    const reg = await registerUser(123);
    expect(reg.status).toBe(201);
    const tradeRes = await invoke('/api/trade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 123, amount: 1, symbol: 'BTC', side: 'BUY' })
    });
    const body = await tradeRes.json();
    expect(tradeRes.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.trade).toBeDefined();
    expect(body.data.newBalance).toBeDefined();
  });
});
