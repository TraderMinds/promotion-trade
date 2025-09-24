// Utility helpers for JSON responses, validation, and safe parsing.
import { ApiError, ApiSuccess } from './types.js';

export function jsonResponse<T>(data: T, requestId: string, status = 200): Response {
  const body: ApiSuccess<T> = { success: true, data, requestId };
  return new Response(JSON.stringify(body), {
    status,
    headers: baseJsonHeaders()
  });
}

export function errorResponse(message: string, requestId: string, status = 400, code?: string): Response {
  const body: ApiError = { success: false, error: message, code, requestId };
  return new Response(JSON.stringify(body), {
    status,
    headers: baseJsonHeaders()
  });
}

export async function parseJsonSafe<T = any>(request: Request, limitBytes = 10_000): Promise<{ ok: true; value: T } | { ok: false; error: string } > {
  try {
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > limitBytes) {
      return { ok: false, error: 'Payload too large' };
    }
    const text = await request.text();
    if (text.length > limitBytes) return { ok: false, error: 'Payload too large' };
    if (!text.trim()) return { ok: false, error: 'Empty body' };
    return { ok: true, value: JSON.parse(text) };
  } catch (e: any) {
    return { ok: false, error: 'Invalid JSON: ' + e.message };
  }
}

export function validateRegisterPayload(obj: any): { ok: true; data: any } | { ok: false; error: string } {
  if (typeof obj !== 'object' || obj === null) return { ok: false, error: 'Invalid object' };
  const required = ['id', 'firstName'];
  for (const key of required) {
    if (!(key in obj)) return { ok: false, error: `Missing field: ${key}` };
  }
  if (typeof obj.id !== 'string' && typeof obj.id !== 'number') return { ok: false, error: 'id must be string or number' };
  if (typeof obj.firstName !== 'string' || !obj.firstName.trim()) return { ok: false, error: 'firstName required' };
  if (obj.balance != null && (typeof obj.balance !== 'number' || obj.balance < 0)) return { ok: false, error: 'balance invalid' };
  // Provide defaults
  const data = {
    id: obj.id,
    firstName: obj.firstName.trim(),
    lastName: obj.lastName || '',
    username: obj.username ?? null,
    languageCode: obj.languageCode || 'en',
    balance: typeof obj.balance === 'number' ? obj.balance : 10.0,
    registered: true,
    createdAt: obj.createdAt || new Date().toISOString(),
    positions: obj.positions || [],
    tradeHistory: obj.tradeHistory || [],
    transactions: obj.transactions || [],
    totalTrades: obj.totalTrades || 0,
    winRate: obj.winRate || 0
  };
  return { ok: true, data };
}

export function baseJsonHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  };
}

export function generateRequestId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Placeholder for Telegram init data verification (Phase 2)
export async function verifyTelegramInitData(initData: string | undefined, botToken: string | undefined): Promise<boolean> {
  if (!initData || !botToken) return false;
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return false;
    params.delete('hash');
    // Sort keys
    const dataCheckArr: string[] = [];
    [...params.keys()].sort().forEach(k => {
      const v = params.get(k);
      if (v != null) dataCheckArr.push(`${k}=${v}`);
    });
    const dataCheckString = dataCheckArr.join('\n');

    // Create secret key = HMAC_SHA256("WebAppData", bot_token)
    const enc = new TextEncoder();
    const secretKey = await crypto.subtle.importKey(
      'raw',
      await crypto.subtle.sign(
        { name: 'HMAC', hash: 'SHA-256' },
        await crypto.subtle.importKey('raw', enc.encode('WebAppData'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
        enc.encode(botToken)
      ),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuf = await crypto.subtle.sign('HMAC', secretKey, enc.encode(dataCheckString));
    const signatureHex = [...new Uint8Array(signatureBuf)].map(b => b.toString(16).padStart(2, '0')).join('');
    return signatureHex === hash;
  } catch (e) {
    console.error('verifyTelegramInitData error', e);
    return false;
  }
}

// Simple fixed-window rate limiter (per key) using KV.
// keyBase: typically an IP address or user identifier
// windowSeconds: duration of the window (default 60s)
// max: maximum allowed requests per window
// Returns { allowed: boolean, remaining: number, reset: number }
export async function rateLimit(
  env: { TRADING_KV: KVNamespace },
  keyBase: string,
  max = 60,
  windowSeconds = 60
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  const now = Date.now();
  const windowStart = Math.floor(now / (windowSeconds * 1000)) * windowSeconds * 1000; // window start ms
  const key = `ratelimit:${keyBase}:${windowStart}`;
  try {
    const currentRaw = await env.TRADING_KV.get(key);
    let current = currentRaw ? parseInt(currentRaw) : 0;
    current += 1;
    // Persist updated count with TTL = windowSeconds + small buffer
    // Cloudflare KV put has no native TTL w/ js API in workers (it does: expirationTtl), but types may vary.
    await (env.TRADING_KV as any).put(key, current.toString(), { expirationTtl: windowSeconds + 5 });
    const remaining = Math.max(0, max - current);
    return { allowed: current <= max, remaining, reset: windowStart + windowSeconds * 1000 };
  } catch (e) {
    console.error('rateLimit error', e);
    // Fail open if KV fails
    return { allowed: true, remaining: max, reset: Date.now() + windowSeconds * 1000 };
  }
}

// Basic structured logging helper
export function logEvent(event: string, meta: Record<string, any> = {}, level: 'info' | 'warn' | 'error' = 'info') {
  try {
    const base = {
      ts: new Date().toISOString(),
      level,
      event,
      ...meta,
    };
    const line = JSON.stringify(base);
    if (level === 'error') console.error(line); else if (level === 'warn') console.warn(line); else console.log(line);
  } catch (e) {
    console.error('logEvent failure', e);
  }
}

// incrementCounter moved to data/metrics.ts
