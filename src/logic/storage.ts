export interface UserState {
  userId: number;
  balance: number; // USD
  trades: StoredTrade[];
  updatedAt: number;
}

export interface StoredTrade {
  id: string;
  ts: number;
  amount: number;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  profit: number;
}

export interface Env {
  TRADING_KV: KVNamespace;
}

const USER_PREFIX = 'user:';

export async function getUserState(env: Env, userId: number): Promise<UserState> {
  const key = USER_PREFIX + userId;
  const json = await env.TRADING_KV.get(key);
  if (json) return JSON.parse(json);
  const fresh: UserState = { userId, balance: 10000, trades: [], updatedAt: Date.now() };
  await env.TRADING_KV.put(key, JSON.stringify(fresh));
  return fresh;
}

export async function saveUserState(env: Env, state: UserState) {
  state.updatedAt = Date.now();
  await env.TRADING_KV.put(USER_PREFIX + state.userId, JSON.stringify(state));
}

export async function appendTrade(env: Env, userId: number, trade: StoredTrade) {
  const state = await getUserState(env, userId);
  state.trades.push(trade);
  state.balance = +(state.balance + trade.profit).toFixed(2);
  await saveUserState(env, state);
  return state;
}
