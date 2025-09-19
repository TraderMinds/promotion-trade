/// <reference types="@cloudflare/workers-types" />

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramWebAppInitData {
  query_id?: string;
  user?: TelegramUser;
  auth_date: number;
  hash: string;
}

export function verifyTelegramWebAppData(initData: string, botToken: string): TelegramUser | null {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) return null;

    // Remove hash from data for verification
    urlParams.delete('hash');
    
    // Sort parameters and create data-check-string
    const dataCheckArr: string[] = [];
    for (const [key, value] of Array.from(urlParams.entries()).sort()) {
      dataCheckArr.push(`${key}=${value}`);
    }
    const dataCheckString = dataCheckArr.join('\n');

    // Create secret key
    const secretKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode('WebAppData'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const tokenKey = await crypto.subtle.sign('HMAC', secretKey, new TextEncoder().encode(botToken));
    
    const hmacKey = await crypto.subtle.importKey(
      'raw',
      tokenKey,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const computedHash = await crypto.subtle.sign('HMAC', hmacKey, new TextEncoder().encode(dataCheckString));
    const computedHashHex = Array.from(new Uint8Array(computedHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (computedHashHex !== hash) {
      return null;
    }

    // Check auth_date (data should be recent)
    const authDate = parseInt(urlParams.get('auth_date') || '0');
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) { // 24 hours
      return null;
    }

    // Parse user data
    const userParam = urlParams.get('user');
    if (!userParam) return null;
    
    return JSON.parse(userParam) as TelegramUser;
  } catch (error) {
    return null;
  }
}

export function extractUserFromInitData(initDataString: string): number {
  try {
    const urlParams = new URLSearchParams(initDataString);
    const userParam = urlParams.get('user');
    if (!userParam) return 0;
    
    const user = JSON.parse(userParam) as TelegramUser;
    return user.id;
  } catch {
    return 0;
  }
}