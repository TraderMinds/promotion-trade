import { errorResponse, jsonResponse, parseJsonSafe, rateLimit, logEvent } from '../utils.js';
import { incrementCounter } from '../data/metrics.js';
import type { Env } from '../worker.js';
import { getUserData, saveUserData } from '../data/users.js';

// Trade execution handler extracted from worker
export async function handleTrade(request: Request, env: Env, requestId: string, corsHeaders: Record<string,string>, start: number) {
  const body = await parseJsonSafe<any>(request);
  if (!body.ok) return errorResponse(body.error, requestId, 400, 'BAD_JSON');
  const { userId, amount, symbol = 'BTC', side = 'BUY', pnl } = body.value || {};
  if (!userId) return errorResponse('userId required', requestId, 400, 'VALIDATION_ERROR');
  if (typeof amount !== 'number' || amount <= 0) return errorResponse('amount must be > 0', requestId, 422, 'VALIDATION_ERROR');
  const allowedSymbols = ['BTC','ETH','XAU'];
  if (!allowedSymbols.includes(symbol)) return errorResponse('unsupported symbol', requestId, 422, 'VALIDATION_ERROR');
  if (!['BUY','SELL'].includes(side)) return errorResponse('invalid side', requestId, 422, 'VALIDATION_ERROR');
  // Per-user trade rate limit
  const perUserRl = await rateLimit(env as any, `user:${userId}:trade`, 30, 60);
  if (!perUserRl.allowed) {
    const res = errorResponse('User trade rate limit exceeded', requestId, 429, 'RATE_LIMIT_USER');
    Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
    logEvent('rate.limit.user.trade.block', { requestId, userId, remaining: perUserRl.remaining, latencyMs: Date.now()-start });
    return res;
  }
  // Load user
  const user = await getUserData(parseInt(userId), env);
  if (!user) return errorResponse('User not found', requestId, 404, 'NOT_FOUND');
  
  // Skip balance check for animated trades with pre-calculated PnL
  if (typeof pnl !== 'number' && user.balance < amount) {
    return errorResponse('Insufficient balance', requestId, 400, 'INSUFFICIENT_FUNDS');
  }
  // Use provided PnL or simulate trade
  let entryPrice, exitPrice, pnlPct, pnlUsd, ticks;
  
  if (typeof pnl === 'number') {
    // Use pre-calculated PnL from animated trade
    pnlUsd = pnl;
    pnlPct = (pnl / amount) * 100;
    entryPrice = 100; // Default values for display
    exitPrice = entryPrice + (entryPrice * pnlPct / 100);
    ticks = [entryPrice, exitPrice]; // Minimal tick data
  } else {
    // Simulate 20 ticks for real-time trading
    ticks = [];
    let price = 100 + Math.random() * 10; // base price
    const drift = 0.0008; // mild upward drift
    for (let i = 0; i < 20; i++) {
      const rnd = (Math.random() - 0.5) * 0.01; // +/-0.5%
      price = price * (1 + rnd + drift);
      ticks.push(parseFloat(price.toFixed(4)));
    }
    entryPrice = ticks[0];
    exitPrice = ticks[ticks.length - 1];
    pnlPct = ((exitPrice - entryPrice) / entryPrice) * 100;
    if (side === 'SELL') pnlPct = -pnlPct; // inverse for SELL
    pnlUsd = (pnlPct / 100) * amount;
  }
  // Don't update balance directly - it will be calculated from transactions
  user.totalTrades = (user.totalTrades || 0) + 1;
  const wins = (user.tradeHistory || []).filter((t: any) => t.pnlUsd > 0).length + (pnlUsd > 0 ? 1 : 0);
  user.winRate = parseFloat(((wins / user.totalTrades) * 100).toFixed(1));
  const tradeRecord = {
    id: 't_' + Date.now().toString(36),
    symbol,
    side,
    startedAt: new Date(Date.now() - 20000).toISOString(),
    finishedAt: new Date().toISOString(),
    entryPrice,
    exitPrice,
    pnlPct: parseFloat(pnlPct.toFixed(2)),
    pnlUsd: parseFloat(pnlUsd.toFixed(2)),
    ticks: ticks.length
  };
  
  // Create transaction record for trade P&L
  const transaction = {
    id: 'trade_' + tradeRecord.id,
    type: 'TRADE_PNL' as const,
    amount: parseFloat(pnlUsd.toFixed(2)),
    createdAt: new Date().toISOString(),
    meta: {
      tradeId: tradeRecord.id,
      symbol,
      side,
      pnlPct: parseFloat(pnlPct.toFixed(2)),
      entryPrice,
      exitPrice
    }
  };
  
  user.tradeHistory = [...(user.tradeHistory || []), tradeRecord].slice(-100);
  user.transactions = [...(user.transactions || []), transaction];
  
  // Recalculate balance from all transactions
  const deposits = user.transactions.filter((t: any) => t.type === 'DEPOSIT' && t.meta?.status === 'approved').reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
  const withdrawals = user.transactions.filter((t: any) => t.type === 'WITHDRAW').reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
  const adjustments = user.transactions.filter((t: any) => t.type === 'ADJUSTMENT').reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
  const tradePnL = user.transactions.filter((t: any) => t.type === 'TRADE_PNL').reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
  
  user.balance = deposits + withdrawals + adjustments + tradePnL;
  
  await saveUserData(user.id, user, env);
  const res = jsonResponse({ success: true, data: { trade: tradeRecord, ticks, newBalance: user.balance } }, requestId, 201);
  incrementCounter(env as any, 'api.trade');
  logEvent('trade.exec', { requestId, userId: user.id, tradeId: tradeRecord.id, pnlUsd: tradeRecord.pnlUsd, pnlPct: tradeRecord.pnlPct, latencyMs: Date.now()-start });
  Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
  return res;
}

// user data helpers now imported from shared data/users.ts
