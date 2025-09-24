import { logEvent } from '../utils.js';

// Increment a simple numeric counter stored in KV.
// Non-atomic: last write wins if race. Good enough for lightweight metrics.
export async function incrementCounter(env: { TRADING_KV: KVNamespace }, name: string): Promise<void> {
  try {
    const key = `metrics:counter:${name}`;
    const currentRaw = await env.TRADING_KV.get(key);
    const current = currentRaw ? parseInt(currentRaw) : 0;
    await env.TRADING_KV.put(key, (current + 1).toString());
  } catch (e:any) {
    logEvent('metrics.increment.error', { name, message: e.message }, 'warn');
  }
}
