// Minimal mock environment and fetch wrapper for testing handler logic.
import worker from '../src/worker.js';

interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export function mockEnv() {
  const store = new Map<string,string>();
  const kv: KVNamespaceLike = {
    async get(key: string) { return store.get(key) ?? null; },
    async put(key: string, value: string) { store.set(key, value); },
    async delete(key: string) { store.delete(key); }
  } as any;
  const env: any = {
    TRADING_KV: kv,
    BASE_URL: 'http://localhost',
    MINIAPP_URL: 'http://localhost/miniapp',
    TELEGRAM_BOT_TOKEN: 'test_token'
  };
  return { env, store };
}

export async function invoke(path: string, init: RequestInit = {}, envOverride: any = {}) {
  const { env } = mockEnv();
  Object.assign(env, envOverride);
  const req = new Request('http://localhost' + path, init);
  return await (worker as any).fetch(req, env);
}
