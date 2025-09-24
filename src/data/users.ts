import { logEvent } from '../utils.js';
import type { Env } from '../worker.js';

const PREFIX = 'user:';
const DEFAULT_CACHE_TTL_MS = 5000; // 5s ephemeral cache
interface CacheEntry { value: any; expires: number }
const cache = new Map<number, CacheEntry>();

function cacheEnabled(): boolean {
  return (globalThis as any).__USER_CACHE_ENABLED !== false; // default on unless explicitly turned off
}

export function setUserCacheEnabled(enabled: boolean) {
  (globalThis as any).__USER_CACHE_ENABLED = enabled;
}

export async function getUserData(userId: number, env: Env): Promise<any | null> {
  try {
    if (cacheEnabled()) {
      const hit = cache.get(userId);
      if (hit && hit.expires > Date.now()) {
        logEvent('user.cache.hit', { userId });
        return hit.value;
      } else if (hit) {
        cache.delete(userId);
      }
    }
    const raw = await env.TRADING_KV.get(PREFIX + userId);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && cacheEnabled()) {
      cache.set(userId, { value: parsed, expires: Date.now() + DEFAULT_CACHE_TTL_MS });
    }
    return parsed;
  } catch (e:any) {
    logEvent('user.get.error', { userId, message: e.message }, 'error');
    return null;
  }
}

export async function saveUserData(userId: number, user: any, env: Env): Promise<void> {
  try {
    await env.TRADING_KV.put(PREFIX + userId, JSON.stringify(user));
    if (cacheEnabled()) {
      cache.set(userId, { value: user, expires: Date.now() + DEFAULT_CACHE_TTL_MS });
    }
  } catch (e:any) {
    logEvent('user.save.error', { userId, message: e.message }, 'error');
  }
}

export function clearUserCache() {
  cache.clear();
}
