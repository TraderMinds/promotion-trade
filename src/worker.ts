import { jsonResponse, errorResponse, parseJsonSafe, validateRegisterPayload, generateRequestId, verifyTelegramInitData, rateLimit, logEvent } from './utils.js';
import { incrementCounter } from './data/metrics.js';
import { User } from './types.js';
import { renderMiniApp } from './miniapp.js';
import { getMiniAppClientScript } from './miniappClient.js';
import { handleTelegramWebhook } from './telegram.js';
import { handleTelegramUpdate } from './telegramBot.js';
import { handleTrade } from './handlers/trade.js';
import { getUserData, saveUserData } from './data/users.js';

export interface Env {
  TRADING_KV: KVNamespace;
  BASE_URL: string;
  MINIAPP_URL: string;
  TELEGRAM_BOT_TOKEN: string;
  BOT_TOKEN_SECRET: string;
  REQUIRE_INIT_FOR_TRADE?: string; // 'true' to enforce telegram init validation on /api/trade
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestId = generateRequestId();
    const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const start = Date.now();

    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-Id',
      'Access-Control-Expose-Headers': 'X-Request-Id',
      'X-Request-Id': requestId,
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Basic rate limiting (60 req/min per IP)
      const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'unknown';
      const rl = await rateLimit(env as any, ip, 60, 60);
      if (!rl.allowed) {
        const retrySec = Math.max(0, Math.floor((rl.reset - Date.now()) / 1000));
        const res = errorResponse('Rate limit exceeded. Try again later.', requestId, 429, 'RATE_LIMIT');
        res.headers.set('Retry-After', retrySec.toString());
        Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
        logEvent('rate.limit.block', { requestId, ip, path: url.pathname, method, remaining: rl.remaining, reset: rl.reset, latencyMs: Date.now()-start });
        return res;
      }
      // Attach rate limit headers for observability
      corsHeaders['X-RateLimit-Limit'] = '60';
      corsHeaders['X-RateLimit-Remaining'] = rl.remaining.toString();
      corsHeaders['X-RateLimit-Reset'] = rl.reset.toString();
      // Miniapp HTML
      if (url.pathname === '/miniapp' || url.pathname === '/miniapp/') {
        const res = renderMiniApp(env);
        // Metrics (fire & forget)
        incrementCounter(env as any, 'miniapp.render');
        logEvent('miniapp.render', { requestId, path: url.pathname, ip, latencyMs: Date.now()-start });
        Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
        return res;
      }

      // Admin Dashboard
      if (url.pathname === '/admin' || url.pathname === '/admin/') {
        const password = url.searchParams.get('password');
        if (password !== '*Trader354638#') {
          return new Response(renderAdminLogin(), {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        }
        const res = await renderAdminDashboard(env);
        incrementCounter(env as any, 'admin.access');
        logEvent('admin.access', { requestId, ip, latencyMs: Date.now()-start });
        Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
        return res;
      }

      // Telegram webhook (new bot system)
      if (url.pathname === '/webhook' && method === 'POST') {
        try {
          const update = await request.json() as any;
          const res = await handleTelegramUpdate(update, env);
          incrementCounter(env as any, 'telegram.webhook');
          logEvent('telegram.webhook', { requestId, status: res.status, latencyMs: Date.now()-start });
          Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
          return res;
        } catch (error) {
          console.error('[Worker] Webhook error:', error);
          const res = new Response('OK', { status: 200 }); // Always return 200 to Telegram
          Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
          return res;
        }
      }

      // API namespace
      if (url.pathname.startsWith('/api/')) {
        if (url.pathname === '/api/health' && method === 'GET') {
          const started = (globalThis as any).__appStart || ((globalThis as any).__appStart = Date.now());
          let kvOk = true;
          try { await env.TRADING_KV.get('health_probe_dummy'); } catch { kvOk = false; }
          const res = jsonResponse({
            status: 'ok',
            time: new Date().toISOString(),
            uptimeMs: Date.now() - started,
            kv: kvOk ? 'reachable' : 'error'
          }, requestId);
          incrementCounter(env as any, 'api.health');
          logEvent('health.check', { requestId, kv: kvOk, latencyMs: Date.now()-start });
          Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
          return res;
        }
        if (url.pathname === '/api/prices' && method === 'GET') {
          const res = handlePrices();
          incrementCounter(env as any, 'api.prices');
          logEvent('prices.get', { requestId, latencyMs: Date.now()-start });
          Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
          return res;
        }
        if (url.pathname === '/api/user/register' && method === 'POST') {
          const initHeader = request.headers.get('X-Telegram-Init');
          if (initHeader) {
            const ok = await verifyTelegramInitData(initHeader, env.TELEGRAM_BOT_TOKEN);
            if (!ok) {
              const res = errorResponse('Invalid telegram init data', requestId, 401, 'UNAUTHORIZED');
              Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
              logEvent('user.register.initdata.invalid', { requestId, ip, latencyMs: Date.now()-start });
              return res;
            }
          }
          const body = await parseJsonSafe<User>(request);
          if (!body.ok) return errorResponse(body.error, requestId, 400, 'BAD_JSON');
          const val = validateRegisterPayload(body.value);
          if (!val.ok) return errorResponse(val.error, requestId, 422, 'VALIDATION_ERROR');
          // Per-user rate limit (registration) if id available
          const perUserRl = await rateLimit(env as any, `user:${val.data.id}`, 30, 60);
          if (!perUserRl.allowed) {
            const res = errorResponse('User rate limit exceeded', requestId, 429, 'RATE_LIMIT_USER');
            Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
            logEvent('rate.limit.user.block', { requestId, userId: val.data.id, remaining: perUserRl.remaining, latencyMs: Date.now()-start });
            return res;
          }
          // Add initial gift transaction if this is a new user
          if (val.data.balance === 10.0 && (!val.data.transactions || val.data.transactions.length === 0)) {
            const giftTransaction = {
              id: 'gift_' + Date.now().toString(36),
              type: 'ADJUSTMENT' as const,
              amount: 10.0,
              createdAt: new Date().toISOString(),
              meta: { type: 'welcome_gift', description: 'Welcome gift bonus' }
            };
            val.data.transactions = [giftTransaction];
          }
          
          await saveUserData(val.data.id, val.data, env);
          const res = jsonResponse({ id: val.data.id, balance: val.data.balance, firstName: val.data.firstName }, requestId, 201);
          incrementCounter(env as any, 'api.user.register');
          logEvent('user.register.success', { requestId, userId: val.data.id, latencyMs: Date.now()-start });
          Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
          return res;
        }
        if (url.pathname.startsWith('/api/user/') && url.pathname.endsWith('/balance') && method === 'GET') {
          const userId = url.pathname.split('/')[3];
          let user = await getUserData(parseInt(userId), env);
          if (!user) {
            // Initialize new user with default data
            user = {
              id: parseInt(userId),
              balance: 10000, // Default demo balance
              transactions: [
                {
                  id: 'init_' + Date.now(),
                  type: 'ADJUSTMENT',
                  amount: 10000,
                  timestamp: new Date().toISOString(),
                  status: 'APPROVED',
                  description: 'Initial demo balance',
                  metadata: { source: 'system_init' }
                }
              ],
              trades: [],
              settings: {},
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            await saveUserData(parseInt(userId), user, env);
            logEvent('user.created', { userId: parseInt(userId) });
          }
          
          // Calculate balance from all transaction sources (only approved deposits)
          const deposits = user.transactions?.filter((t: any) => t.type === 'DEPOSIT' && t.meta?.status === 'approved').reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
          const withdrawals = user.transactions?.filter((t: any) => t.type === 'WITHDRAW').reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
          const adjustments = user.transactions?.filter((t: any) => t.type === 'ADJUSTMENT').reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
          const tradePnL = user.transactions?.filter((t: any) => t.type === 'TRADE_PNL').reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
          
          const calculatedBalance = deposits + withdrawals + adjustments + tradePnL;
          
          // Update user balance if different
          if (Math.abs(user.balance - calculatedBalance) > 0.01) {
            user.balance = calculatedBalance;
            await saveUserData(user.id, user, env);
          }
          
          const res = jsonResponse({ balance: user.balance, breakdown: { deposits, withdrawals, adjustments, tradePnL, total: calculatedBalance } }, requestId);
          Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
          return res;
        }
        if (url.pathname.startsWith('/api/user/') && method === 'GET') {
          const userId = url.pathname.split('/')[3];
          const user = await getUserData(parseInt(userId), env);
          if (!user) {
            const res = errorResponse('User not found', requestId, 404, 'NOT_FOUND');
            Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
            logEvent('user.get.not_found', { requestId, userId, latencyMs: Date.now()-start });
            return res;
          }
          // Per-user rate limit (read profile)
          const perUserRl = await rateLimit(env as any, `user:${userId}`, 30, 60);
          if (!perUserRl.allowed) {
            const resRl = errorResponse('User rate limit exceeded', requestId, 429, 'RATE_LIMIT_USER');
            Object.entries(corsHeaders).forEach(([k,v]) => resRl.headers.set(k,v));
            logEvent('rate.limit.user.block', { requestId, userId, remaining: perUserRl.remaining, latencyMs: Date.now()-start });
            return resRl;
          }
          const res = jsonResponse(user, requestId);
          incrementCounter(env as any, 'api.user.get');
          logEvent('user.get.success', { requestId, userId, latencyMs: Date.now()-start });
            Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
          return res;
        }
        if (url.pathname.startsWith('/api/user/') && url.pathname.endsWith('/transactions') && method === 'GET') {
          const userId = url.pathname.split('/')[3];
          const user = await getUserData(parseInt(userId), env);
          if (!user) {
            const res = errorResponse('User not found', requestId, 404, 'NOT_FOUND');
            Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
            return res;
          }
          
          // Return all transactions sorted by date (newest first)
          const allTransactions = (user.transactions || []).sort((a: any, b: any) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          
          const res = jsonResponse({ transactions: allTransactions, count: allTransactions.length }, requestId);
          Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
          return res;
        }
        if (url.pathname === '/api/deposit' && method === 'POST') {
          const body = await parseJsonSafe<{ userId: number, amount: number, txHash?: string }>(request);
          if (!body.ok) return errorResponse(body.error, requestId, 400, 'BAD_JSON');
          
          const { userId, amount, txHash } = body.value;
          if (!userId || typeof amount !== 'number' || amount <= 0) {
            return errorResponse('Invalid deposit data', requestId, 422, 'VALIDATION_ERROR');
          }
          
          const user = await getUserData(userId, env);
          if (!user) return errorResponse('User not found', requestId, 404, 'NOT_FOUND');
          
          // Create deposit transaction with approval workflow
          const transaction = {
            id: 'dep_' + Date.now().toString(36),
            type: 'DEPOSIT' as const,
            amount: amount,
            createdAt: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            status: 'UNDER_REVIEW', // Status: UNDER_REVIEW -> APPROVED/REJECTED
            description: `Deposit request of $${amount.toFixed(2)} USDT`,
            metadata: { 
              txHash: txHash || null, 
              paymentMethod: 'USDT',
              submittedAt: new Date().toISOString(),
              source: 'user_request',
              reviewRequired: true
            },
            meta: { txHash: txHash || null, status: 'under_review' } // Keep for backward compatibility
          };
          
          user.transactions = [...(user.transactions || []), transaction];
          // Balance is NOT updated until admin approves the deposit
          user.updated_at = new Date().toISOString();
          
          await saveUserData(user.id, user, env);
          
          const res = jsonResponse({ 
            success: true, 
            newBalance: user.balance, 
            transaction, 
            status: 'UNDER_REVIEW',
            message: 'Deposit request submitted and is under review. You will be notified once approved (usually within 24 hours).'
          }, requestId);
          Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
          return res;
        }
        if (url.pathname === '/api/withdraw' && method === 'POST') {
          const body = await parseJsonSafe<{ userId: number, amount: number, address: string }>(request);
          if (!body.ok) return errorResponse(body.error, requestId, 400, 'BAD_JSON');
          
          const { userId, amount, address } = body.value;
          if (!userId || typeof amount !== 'number' || amount <= 0 || !address) {
            return errorResponse('Invalid withdrawal data', requestId, 422, 'VALIDATION_ERROR');
          }
          
          const user = await getUserData(userId, env);
          if (!user) return errorResponse('User not found', requestId, 404, 'NOT_FOUND');
          
          if (user.balance < amount) {
            return errorResponse('Insufficient balance', requestId, 400, 'INSUFFICIENT_FUNDS');
          }
          
          // Create withdrawal transaction with approval workflow
          const transaction = {
            id: 'wit_' + Date.now().toString(36),
            type: 'WITHDRAW' as const,
            amount: amount, // positive until approved, will be made negative when approved
            createdAt: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            status: 'UNDER_REVIEW', // Status: UNDER_REVIEW -> PROCESSING -> COMPLETED/FAILED
            description: `Withdrawal request of $${amount.toFixed(2)} to ${address.substring(0, 10)}...`,
            metadata: { 
              address,
              submittedAt: new Date().toISOString(),
              estimatedCompletion: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
              source: 'user_request',
              reviewRequired: true
            },
            meta: { address, status: 'under_review' } // Keep for backward compatibility
          };
          
          user.transactions = [...(user.transactions || []), transaction];
          
          // Balance is NOT updated until admin approves the withdrawal
          // Only count approved transactions for balance calculation (exclude UNDER_REVIEW withdrawals)
          const deposits = user.transactions.filter((t: any) => t.type === 'DEPOSIT' && (t.status === 'APPROVED' || t.meta?.status === 'approved')).reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
          const withdrawals = user.transactions.filter((t: any) => t.type === 'WITHDRAW' && (t.status === 'PROCESSING' || t.status === 'COMPLETED')).reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
          const adjustments = user.transactions.filter((t: any) => t.type === 'ADJUSTMENT').reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
          const tradePnL = user.transactions.filter((t: any) => t.type === 'TRADE_PNL').reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
          
          user.balance = deposits + withdrawals + adjustments + tradePnL;
          user.updated_at = new Date().toISOString();
          
          await saveUserData(user.id, user, env);
          
          const res = jsonResponse({ 
            success: true, 
            newBalance: user.balance, 
            transaction,
            status: 'UNDER_REVIEW',
            message: 'Withdrawal request submitted and is under review. You will be notified once approved (usually within 24 hours).'
          }, requestId);
          Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
          return res;
        }
        if (url.pathname === '/api/approve-deposit' && method === 'POST') {
          const body = await parseJsonSafe<{ userId: number, transactionId: string }>(request);
          if (!body.ok) return errorResponse(body.error, requestId, 400, 'BAD_JSON');
          
          const { userId, transactionId } = body.value;
          if (!userId || !transactionId) {
            return errorResponse('Invalid approval data', requestId, 422, 'VALIDATION_ERROR');
          }
          
          const user = await getUserData(userId, env);
          if (!user) return errorResponse('User not found', requestId, 404, 'NOT_FOUND');
          
          // Find and approve the transaction
          const transaction = user.transactions?.find((t: any) => t.id === transactionId && t.type === 'DEPOSIT');
          if (!transaction) {
            return errorResponse('Transaction not found', requestId, 404, 'NOT_FOUND');
          }
          
          if (transaction.status === 'APPROVED') {
            return errorResponse('Transaction already approved', requestId, 400, 'ALREADY_APPROVED');
          }
          
          if (transaction.status !== 'UNDER_REVIEW') {
            return errorResponse('Can only approve transactions under review', requestId, 400, 'INVALID_STATUS');
          }
          
          // Approve the transaction and add to balance
          transaction.meta.status = 'approved'; // Keep for backward compatibility
          transaction.status = 'APPROVED';
          transaction.approvedAt = new Date().toISOString();
          transaction.metadata = transaction.metadata || {};
          transaction.metadata.approvedBy = 'admin';
          transaction.metadata.approvalTimestamp = new Date().toISOString();
          
          // Recalculate balance from all transactions (now including this approved deposit)
          const deposits = user.transactions.filter((t: any) => t.type === 'DEPOSIT' && (t.status === 'APPROVED' || t.meta?.status === 'approved')).reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
          const withdrawals = user.transactions.filter((t: any) => t.type === 'WITHDRAW' && (t.status === 'PROCESSING' || t.status === 'COMPLETED')).reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
          const adjustments = user.transactions.filter((t: any) => t.type === 'ADJUSTMENT').reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
          const tradePnL = user.transactions.filter((t: any) => t.type === 'TRADE_PNL').reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
          
          user.balance = deposits + withdrawals + adjustments + tradePnL;
          user.updated_at = new Date().toISOString();
          
          await saveUserData(user.id, user, env);
          
          const res = jsonResponse({ 
            success: true, 
            newBalance: user.balance, 
            transaction,
            message: `Deposit of $${transaction.amount.toFixed(2)} has been approved and added to balance.`
          }, requestId);
          Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
          return res;
        }
        if (url.pathname === '/api/approve-withdraw' && method === 'POST') {
          const body = await parseJsonSafe<{ userId: number, transactionId: string }>(request);
          if (!body.ok) return errorResponse(body.error, requestId, 400, 'BAD_JSON');
          
          const { userId, transactionId } = body.value;
          if (!userId || !transactionId) {
            return errorResponse('Invalid approval data', requestId, 422, 'VALIDATION_ERROR');
          }
          
          const user = await getUserData(userId, env);
          if (!user) return errorResponse('User not found', requestId, 404, 'NOT_FOUND');
          
          // Find the withdrawal transaction
          const transaction = user.transactions?.find((t: any) => t.id === transactionId && t.type === 'WITHDRAW');
          if (!transaction) {
            return errorResponse('Withdrawal transaction not found', requestId, 404, 'NOT_FOUND');
          }
          
          if (transaction.status === 'PROCESSING') {
            return errorResponse('Withdrawal already approved and processing', requestId, 400, 'ALREADY_APPROVED');
          }
          
          if (transaction.status !== 'UNDER_REVIEW') {
            return errorResponse('Can only approve withdrawals under review', requestId, 400, 'INVALID_STATUS');
          }
          
          // Approve the withdrawal and deduct from balance
          transaction.meta.status = 'processing'; // Keep for backward compatibility
          transaction.status = 'PROCESSING';
          transaction.amount = -Math.abs(transaction.amount); // Make amount negative when approved
          transaction.approvedAt = new Date().toISOString();
          transaction.metadata = transaction.metadata || {};
          transaction.metadata.approvedBy = 'admin';
          transaction.metadata.approvalTimestamp = new Date().toISOString();
          
          // Recalculate balance from all transactions (now deducting this approved withdrawal)
          const deposits = user.transactions.filter((t: any) => t.type === 'DEPOSIT' && (t.status === 'APPROVED' || t.meta?.status === 'approved')).reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
          const withdrawals = user.transactions.filter((t: any) => t.type === 'WITHDRAW' && (t.status === 'PROCESSING' || t.status === 'COMPLETED')).reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
          const adjustments = user.transactions.filter((t: any) => t.type === 'ADJUSTMENT').reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
          const tradePnL = user.transactions.filter((t: any) => t.type === 'TRADE_PNL').reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
          
          user.balance = deposits + withdrawals + adjustments + tradePnL;
          user.updated_at = new Date().toISOString();
          
          await saveUserData(user.id, user, env);
          
          const res = jsonResponse({ 
            success: true, 
            newBalance: user.balance, 
            transaction,
            message: `Withdrawal of $${Math.abs(transaction.amount).toFixed(2)} has been approved and is now processing.`
          }, requestId);
          Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
          return res;
        }
        if (url.pathname === '/api/trade' && method === 'POST') {
          const initHeader = request.headers.get('X-Telegram-Init');
          const requireInit = env.REQUIRE_INIT_FOR_TRADE === 'true';
          if (requireInit && !initHeader) {
            const res = errorResponse('Telegram init required', requestId, 401, 'UNAUTHORIZED');
            Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
            logEvent('trade.init.missing', { requestId, latencyMs: Date.now()-start });
            return res;
          }
          if (initHeader) {
            const ok = await verifyTelegramInitData(initHeader, env.TELEGRAM_BOT_TOKEN);
            if (!ok) {
              const res = errorResponse('Invalid telegram init data', requestId, 401, 'UNAUTHORIZED');
              Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
              logEvent('trade.init.invalid', { requestId, latencyMs: Date.now()-start });
              return res;
            }
          }
          return await handleTrade(request, env, requestId, corsHeaders, start);
        }

        // Admin API Endpoints
        if (url.pathname === '/api/admin/users' && method === 'GET') {
          const password = url.searchParams.get('password');
          if (password !== '*Trader354638#') {
            return errorResponse('Unauthorized', requestId, 401, 'UNAUTHORIZED');
          }
          
          const users = await getAllUsers(env);
          const stats = await getAdminStats(env, users);
          
          const res = jsonResponse({ users, stats }, requestId);
          Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
          return res;
        }

        if (url.pathname === '/api/admin/user/balance' && method === 'POST') {
          const password = url.searchParams.get('password');
          if (password !== '*Trader354638#') {
            return errorResponse('Unauthorized', requestId, 401, 'UNAUTHORIZED');
          }

          const body = await parseJsonSafe<{ userId: number, newBalance: number, reason?: string }>(request);
          if (!body.ok) return errorResponse(body.error, requestId, 400, 'BAD_JSON');
          
          const { userId, newBalance, reason } = body.value;
          if (!userId || newBalance == null) {
            return errorResponse('Invalid balance update data', requestId, 422, 'VALIDATION_ERROR');
          }
          
          const user = await getUserData(userId, env);
          if (!user) return errorResponse('User not found', requestId, 404, 'NOT_FOUND');
          
          const oldBalance = user.balance;
          const adjustmentAmount = newBalance - oldBalance;
          
          // Create adjustment transaction
          const adjustmentTransaction = {
            id: 'adj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            type: 'ADJUSTMENT',
            amount: adjustmentAmount,
            timestamp: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            status: 'APPROVED',
            description: reason || 'Admin balance adjustment',
            metadata: {
              adminAction: true,
              oldBalance,
              newBalance,
              source: 'admin_panel'
            }
          };
          
          user.balance = newBalance;
          user.transactions = user.transactions || [];
          user.transactions.push(adjustmentTransaction);
          user.updated_at = new Date().toISOString();
          
          await saveUserData(userId, user, env);
          logEvent('admin.balance.update', { userId, oldBalance, newBalance, adjustmentAmount });
          
          const res = jsonResponse({ success: true, user, adjustment: adjustmentTransaction }, requestId);
          Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
          return res;
        }

        if (url.pathname === '/api/admin/user/status' && method === 'POST') {
          const password = url.searchParams.get('password');
          if (password !== '*Trader354638#') {
            return errorResponse('Unauthorized', requestId, 401, 'UNAUTHORIZED');
          }

          const body = await parseJsonSafe<{ userId: number, status: string, reason?: string }>(request);
          if (!body.ok) return errorResponse(body.error, requestId, 400, 'BAD_JSON');
          
          const { userId, status, reason } = body.value;
          if (!userId || !['active', 'blocked'].includes(status)) {
            return errorResponse('Invalid status data', requestId, 422, 'VALIDATION_ERROR');
          }
          
          const user = await getUserData(userId, env);
          if (!user) return errorResponse('User not found', requestId, 404, 'NOT_FOUND');
          
          const oldStatus = user.status || 'active';
          user.status = status;
          user.updated_at = new Date().toISOString();
          
          // Add status change to user history
          user.statusHistory = user.statusHistory || [];
          user.statusHistory.push({
            timestamp: new Date().toISOString(),
            oldStatus,
            newStatus: status,
            reason: reason || 'Admin action',
            adminAction: true
          });
          
          await saveUserData(userId, user, env);
          logEvent('admin.status.change', { userId, oldStatus, newStatus: status, reason });
          
          const res = jsonResponse({ success: true, user }, requestId);
          Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
          return res;
        }

        if (url.pathname === '/api/admin/deposits/pending' && method === 'GET') {
          const password = url.searchParams.get('password');
          if (password !== '*Trader354638#') {
            return errorResponse('Unauthorized', requestId, 401, 'UNAUTHORIZED');
          }
          
          const allUsers = await getAllUsers(env);
          const pendingDeposits: any[] = [];
          
          for (const user of allUsers) {
            const deposits = (user.transactions || []).filter((t: any) => 
              t.type === 'DEPOSIT' && t.meta?.status === 'pending'
            );
            
            deposits.forEach((deposit: any) => {
              pendingDeposits.push({
                ...deposit,
                user: {
                  id: user.id,
                  firstName: user.firstName,
                  lastName: user.lastName,
                  balance: user.balance
                }
              });
            });
          }
          
          // Sort by creation date (newest first)
          pendingDeposits.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          
          const res = jsonResponse({ deposits: pendingDeposits, count: pendingDeposits.length }, requestId);
          Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
          return res;
        }

        if (url.pathname === '/api/admin/system/stats' && method === 'GET') {
          const password = url.searchParams.get('password');
          if (password !== '*Trader354638#') {
            return errorResponse('Unauthorized', requestId, 401, 'UNAUTHORIZED');
          }
          
          const users = await getAllUsers(env);
          const stats = await getAdminStats(env, users);
          
          // Enhanced stats
          const now = new Date();
          const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          const past7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          
          const enhancedStats = {
            ...stats,
            systemHealth: {
              uptime: Date.now() - ((globalThis as any).__appStart || Date.now()),
              memoryUsage: 'N/A', // Cloudflare Workers don't expose this
              requestsToday: 0, // Would need to track in KV
            },
            userActivity: {
              signupsLast24h: users.filter(u => new Date(u.created_at) >= past24h).length,
              signupsLast7d: users.filter(u => new Date(u.created_at) >= past7d).length,
              avgBalancePerUser: users.length > 0 ? stats.totalBalance / users.length : 0,
            },
            transactions: {
              totalDeposits: users.reduce((sum, u) => {
                return sum + ((u.transactions || []).filter((t: any) => t.type === 'DEPOSIT').length);
              }, 0),
              totalWithdrawals: users.reduce((sum, u) => {
                return sum + ((u.transactions || []).filter((t: any) => t.type === 'WITHDRAW').length);
              }, 0),
              pendingDeposits: users.reduce((sum, u) => {
                return sum + ((u.transactions || []).filter((t: any) => 
                  t.type === 'DEPOSIT' && t.meta?.status === 'pending'
                ).length);
              }, 0)
            }
          };
          
          const res = jsonResponse(enhancedStats, requestId);
          Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
          return res;
        }

        // Reject deposit
        if (url.pathname === '/api/admin/reject-deposit' && method === 'POST') {
          const password = url.searchParams.get('password');
          if (password !== '*Trader354638#') {
            return errorResponse('Unauthorized', requestId, 401, 'UNAUTHORIZED');
          }
          
          logEvent('api.admin.reject_deposit', { requestId });
          const body = await request.json() as { depositId: string; reason?: string };
          if (!body?.depositId) {
            const res = errorResponse('Missing depositId', requestId, 400, 'INVALID_REQUEST');
            Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
            return res;
          }
          
          // Get deposit to verify it exists and is in correct status
          const depositKey = `deposit:${body.depositId}`;
          const deposit = await env.TRADING_KV.get(depositKey, 'json') as any;
          if (!deposit) {
            const res = errorResponse('Deposit not found', requestId, 404, 'DEPOSIT_NOT_FOUND');
            Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
            return res;
          }
          
          if (deposit.status !== 'UNDER_REVIEW') {
            const res = errorResponse('Can only reject deposits under review', requestId, 400, 'INVALID_STATUS');
            Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
            return res;
          }
          
          // Update deposit status to rejected
          deposit.status = 'REJECTED';
          deposit.rejectedAt = Date.now();
          deposit.rejectedBy = 'admin';
          deposit.rejectionReason = body.reason || 'Rejected by admin';
          
          await env.TRADING_KV.put(depositKey, JSON.stringify(deposit));
          
          logEvent('admin.deposit_rejected', { requestId, depositId: body.depositId, reason: body.reason });
          
          const res = new Response(JSON.stringify({ 
            success: true, 
            message: 'Deposit rejected successfully'
          }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
          });
          Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
          return res;
        }

        // Complete withdrawal
        if (url.pathname === '/api/admin/complete-withdrawal' && method === 'POST') {
          const password = url.searchParams.get('password');
          if (password !== '*Trader354638#') {
            return errorResponse('Unauthorized', requestId, 401, 'UNAUTHORIZED');
          }
          
          logEvent('api.admin.complete_withdrawal', { requestId });
          const body = await request.json() as { userId: number; withdrawalId: string; txHash?: string };
          if (!body?.withdrawalId || !body?.userId) {
            const res = errorResponse('Missing userId or withdrawalId', requestId, 400, 'INVALID_REQUEST');
            Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
            return res;
          }
          
          // Get user data and find the withdrawal transaction
          const user = await getUserData(body.userId, env);
          if (!user) {
            const res = errorResponse('User not found', requestId, 404, 'USER_NOT_FOUND');
            Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
            return res;
          }
          
          // Find the withdrawal transaction
          const withdrawal = user.transactions?.find((t: any) => t.id === body.withdrawalId && t.type === 'WITHDRAW');
          if (!withdrawal) {
            const res = errorResponse('Withdrawal transaction not found', requestId, 404, 'WITHDRAWAL_NOT_FOUND');
            Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
            return res;
          }
          
          if (withdrawal.status !== 'PROCESSING') {
            const res = errorResponse('Can only complete processing withdrawals', requestId, 400, 'INVALID_STATUS');
            Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
            return res;
          }
          
          // Update withdrawal status to completed
          withdrawal.status = 'COMPLETED';
          withdrawal.completedAt = new Date().toISOString();
          withdrawal.completedBy = 'admin';
          withdrawal.txHash = body.txHash;
          withdrawal.meta.status = 'completed'; // Keep for backward compatibility
          withdrawal.metadata = withdrawal.metadata || {};
          withdrawal.metadata.completedBy = 'admin';
          withdrawal.metadata.completionTimestamp = new Date().toISOString();
          withdrawal.metadata.txHash = body.txHash;
          
          user.updated_at = new Date().toISOString();
          await saveUserData(user.id, user, env);
          
          logEvent('admin.withdrawal_completed', { requestId, withdrawalId: body.withdrawalId, txHash: body.txHash });
          
          const res = jsonResponse({ 
            success: true, 
            message: 'Withdrawal completed successfully',
            transaction: withdrawal
          }, requestId);
          Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
          return res;
        }

        // Send message to user
        if (url.pathname === '/api/admin/send-message' && method === 'POST') {
          const password = url.searchParams.get('password');
          if (password !== '*Trader354638#') {
            return errorResponse('Unauthorized', requestId, 401, 'UNAUTHORIZED');
          }
          
          logEvent('api.admin.send_message', { requestId });
          const body = await request.json() as { userId: number; message: string; type: string };
          
          if (!body.userId || !body.message) {
            return errorResponse('Missing userId or message', requestId, 400, 'INVALID_REQUEST');
          }
          
          // Get user data
          const user = await getUserData(body.userId, env);
          if (!user) {
            return errorResponse('User not found', requestId, 404, 'USER_NOT_FOUND');
          }
          
          if (!user.telegramId) {
            return errorResponse('User has no Telegram ID', requestId, 400, 'NO_TELEGRAM_ID');
          }
          
          // Send message via Telegram bot
          try {
            const telegramMessage = `📢 *Admin Message*\n\n${body.message}`;
            
            const telegramResponse = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: user.telegramId,
                text: telegramMessage,
                parse_mode: 'Markdown'
              })
            });
            
            const telegramResult = await telegramResponse.json() as { ok: boolean; result?: any; error_code?: number; description?: string };
            
            if (!telegramResult.ok) {
              console.error('Failed to send Telegram message:', telegramResult);
              return errorResponse('Failed to send message', requestId, 500, 'TELEGRAM_ERROR');
            }
            
            // Log message in user history
            user.messageHistory = user.messageHistory || [];
            user.messageHistory.push({
              timestamp: new Date().toISOString(),
              message: body.message,
              type: body.type || 'admin',
              sender: 'admin'
            });
            
            user.updated_at = new Date().toISOString();
            await saveUserData(user.id, user, env);
            
            logEvent('admin.message_sent', { 
              requestId, 
              userId: body.userId, 
              messageType: body.type,
              messageLength: body.message.length
            });
            
            const res = jsonResponse({ 
              success: true, 
              message: 'Message sent successfully'
            }, requestId);
            Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
            return res;
            
          } catch (error) {
            console.error('Error sending message:', error);
            return errorResponse('Failed to send message', requestId, 500, 'SEND_ERROR');
          }
        }

        const nf = errorResponse('Not Found', requestId, 404, 'NOT_FOUND');
        Object.entries(corsHeaders).forEach(([k,v]) => nf.headers.set(k,v));
        logEvent('api.not_found', { requestId, path: url.pathname, method, latencyMs: Date.now()-start });
        return nf;
      }

      // Serve /miniapp/app.js route delivering generated client script with appropriate headers.
      if (url.pathname === '/miniapp/app.js' && method === 'GET') {
        const js = getMiniAppClientScript(env.BASE_URL || '');
        incrementCounter(env as any, 'miniapp.script');
        const res = new Response(js, { status: 200, headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-cache' } });
        Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
        logEvent('miniapp.script', { requestId, latencyMs: Date.now()-start });
        return res;
      }

      const nf = new Response('Not Found', { status: 404, headers: corsHeaders });
      logEvent('route.not_found', { requestId, path: url.pathname, method, latencyMs: Date.now()-start });
      return nf;
    } catch (e: any) {
      console.error('❌ Unhandled error', e);
      logEvent('unhandled.error', { requestId, message: e?.message, stack: e?.stack, latencyMs: Date.now()-start }, 'error');
      const err = errorResponse('Internal Server Error', requestId, 500, 'INTERNAL');
      Object.entries(corsHeaders).forEach(([k,v]) => err.headers.set(k,v));
      return err;
    }
  },
};

function handlePrices(): Response {
  // Add small random volatility to real market prices (September 2025)
  const baseTime = Date.now();
  const btcBase = 112000 + (Math.sin(baseTime / 100000) * 3000);
  const ethBase = 4170 + (Math.sin(baseTime / 80000) * 300);
  const xauBase = 3780 + (Math.sin(baseTime / 120000) * 100);
  
  const cryptoPrices = [
    { 
      symbol: 'BTC', 
      name: 'Bitcoin', 
      price: Math.round(btcBase + (Math.random() - 0.5) * 1000), 
      change: (Math.random() - 0.5) * 6 
    },
    { 
      symbol: 'ETH', 
      name: 'Ethereum', 
      price: Math.round(ethBase + (Math.random() - 0.5) * 150), 
      change: (Math.random() - 0.5) * 5 
    },
    { 
      symbol: 'XAU', 
      name: 'Gold', 
      price: Math.round(xauBase + (Math.random() - 0.5) * 80), 
      change: (Math.random() - 0.5) * 3 
    }
  ];
  
  return new Response(JSON.stringify(cryptoPrices), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Admin Dashboard Functions
function renderAdminLogin(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Login - TradeX Pro</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .login-container {
      background: white;
      padding: 40px;
      border-radius: 20px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      text-align: center;
      max-width: 400px;
      width: 90%;
    }
    .login-title {
      font-size: 28px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 30px;
    }
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .input-group input {
      width: 100%;
      padding: 15px;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      font-size: 16px;
      transition: border-color 0.3s ease;
    }
    .input-group input:focus {
      outline: none;
      border-color: #3b82f6;
    }
    .login-btn {
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      padding: 15px;
      border: none;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.3s ease;
    }
    .login-btn:hover {
      transform: translateY(-2px);
    }
  </style>
</head>
<body>
  <div class="login-container">
    <h1 class="login-title">🔐 Admin Access</h1>
    <form class="login-form" onsubmit="handleLogin(event)">
      <div class="input-group">
        <input type="password" id="admin-password" placeholder="Enter admin password" required>
      </div>
      <button type="submit" class="login-btn">Access Dashboard</button>
    </form>
  </div>
  
  <script>
    function handleLogin(event) {
      event.preventDefault();
      const password = document.getElementById('admin-password').value;
      window.location.href = '/admin?password=' + encodeURIComponent(password);
    }
  </script>
</body>
</html>`;
}

async function renderAdminDashboard(env: Env): Promise<Response> {
  // Fetch all users and statistics
  const allUsers = await getAllUsers(env);
  const stats = await getAdminStats(env, allUsers);
  
  // Get pending deposits (under review)
  const pendingDeposits: any[] = [];
  for (const user of allUsers) {
    const deposits = (user.transactions || []).filter((t: any) => 
      t.type === 'DEPOSIT' && (t.status === 'UNDER_REVIEW' || t.meta?.status === 'under_review')
    );
    deposits.forEach((deposit: any) => {
      pendingDeposits.push({
        ...deposit,
        user: {
          id: user.id,
          firstName: user.firstName || 'Unknown',
          lastName: user.lastName || '',
          balance: user.balance
        }
      });
    });
  }
  pendingDeposits.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Get withdrawals awaiting approval (under review)
  const pendingWithdrawals: any[] = [];
  for (const user of allUsers) {
    const withdrawals = (user.transactions || []).filter((t: any) => 
      t.type === 'WITHDRAW' && (t.status === 'UNDER_REVIEW' || t.meta?.status === 'under_review')
    );
    withdrawals.forEach((withdrawal: any) => {
      pendingWithdrawals.push({
        ...withdrawal,
        user: {
          id: user.id,
          firstName: user.firstName || 'Unknown',
          lastName: user.lastName || '',
          balance: user.balance
        }
      });
    });
  }
  pendingWithdrawals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Get approved withdrawals (ready to complete)
  const approvedWithdrawals: any[] = [];
  for (const user of allUsers) {
    const withdrawals = (user.transactions || []).filter((t: any) => 
      t.type === 'WITHDRAW' && (t.status === 'PROCESSING' || t.meta?.status === 'processing')
    );
    withdrawals.forEach((withdrawal: any) => {
      approvedWithdrawals.push({
        ...withdrawal,
        user: {
          id: user.id,
          firstName: user.firstName || 'Unknown',
          lastName: user.lastName || '',
          balance: user.balance
        }
      });
    });
  }
  approvedWithdrawals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Dashboard - TradeX Pro</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      line-height: 1.6;
    }
    .admin-container {
      max-width: 1600px;
      margin: 0 auto;
      padding: 20px;
    }
    .admin-header {
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      padding: 30px;
      border-radius: 15px;
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .admin-title {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 5px;
    }
    .admin-subtitle {
      font-size: 16px;
      opacity: 0.9;
    }
    .admin-actions {
      display: flex;
      gap: 10px;
    }
    .header-btn {
      background: rgba(255,255,255,0.2);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s ease;
    }
    .header-btn:hover {
      background: rgba(255,255,255,0.3);
      transform: translateY(-1px);
    }
    .dashboard-tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 30px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 0;
    }
    .tab-btn {
      background: none;
      border: none;
      padding: 15px 25px;
      cursor: pointer;
      font-weight: 600;
      color: #64748b;
      border-bottom: 3px solid transparent;
      transition: all 0.3s ease;
    }
    .tab-btn.active {
      color: #3b82f6;
      border-bottom-color: #3b82f6;
    }
    .tab-content {
      display: none;
    }
    .tab-content.active {
      display: block;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: white;
      padding: 25px;
      border-radius: 15px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      border: 1px solid #e5e7eb;
    }
    .stat-title {
      font-size: 14px;
      color: #64748b;
      font-weight: 600;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #1e293b;
    }
    .stat-change {
      font-size: 12px;
      margin-top: 5px;
    }
    .positive { color: #10b981; }
    .negative { color: #ef4444; }
    .users-section {
      background: white;
      border-radius: 15px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .section-header {
      background: #f8fafc;
      padding: 20px 25px;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .section-title {
      font-size: 20px;
      font-weight: 700;
    }
    .search-box {
      padding: 8px 15px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 14px;
    }
    .users-table {
      width: 100%;
      border-collapse: collapse;
    }
    .users-table th,
    .users-table td {
      padding: 15px 25px;
      text-align: left;
      border-bottom: 1px solid #f1f5f9;
    }
    .users-table th {
      background: #f8fafc;
      font-weight: 600;
      color: #64748b;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .users-table tr:hover {
      background: #f8fafc;
    }
    .user-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 14px;
    }
    .user-details h4 {
      font-weight: 600;
      margin-bottom: 2px;
    }
    .user-details span {
      font-size: 12px;
      color: #64748b;
    }
    .balance-amount {
      font-weight: 600;
      font-size: 16px;
    }
    .action-btn {
      padding: 6px 12px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      background: white;
      cursor: pointer;
      font-size: 12px;
      margin-right: 5px;
      transition: all 0.3s ease;
    }
    .action-btn:hover {
      background: #f3f4f6;
    }
    .users-table th:nth-child(1) { width: 180px; } /* User */
    .users-table th:nth-child(2) { width: 160px; } /* Email */
    .users-table th:nth-child(3) { width: 120px; } /* Balance */
    .users-table th:nth-child(4) { width: 100px; } /* Deposits */
    .users-table th:nth-child(5) { width: 100px; } /* Withdrawals */
    .users-table th:nth-child(6) { width: 80px; }  /* Trades */
    .users-table th:nth-child(7) { width: 100px; } /* P&L */
    .users-table th:nth-child(8) { width: 100px; } /* Transactions */
    .users-table th:nth-child(9) { width: 100px; } /* Joined */
    .users-table th:nth-child(10) { width: 100px; } /* Last Active */
    .users-table th:nth-child(11) { width: 100px; } /* Status */
    .users-table th:nth-child(12) { width: 250px; } /* Actions */
    .status-active { color: #10b981; font-weight: 600; }
    .status-blocked { color: #ef4444; font-weight: 600; }
    .refresh-btn {
      position: fixed;
      bottom: 30px;
      right: 30px;
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      color: white;
      border: none;
      padding: 15px;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
      font-size: 18px;
    }
    .pending-deposits {
      background: white;
      border-radius: 15px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      margin-bottom: 30px;
      overflow: hidden;
    }
    .pending-item {
      padding: 20px 25px;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .pending-item:last-child {
      border-bottom: none;
    }
    .pending-info {
      flex: 1;
    }
    .pending-user {
      font-weight: 600;
      margin-bottom: 5px;
    }
    .pending-amount {
      font-size: 18px;
      color: #10b981;
      font-weight: 700;
    }
    .pending-date {
      font-size: 12px;
      color: #64748b;
    }
    .pending-actions {
      display: flex;
      gap: 10px;
    }
    .approve-btn {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s ease;
    }
    .approve-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }
    .reject-btn {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s ease;
    }
    .reject-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    }
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.7);
      z-index: 1000;
      align-items: center;
      justify-content: center;
    }
    .modal.active {
      display: flex;
    }
    .modal-content {
      background: white;
      padding: 30px;
      border-radius: 15px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    }
    .modal-header {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 20px;
      color: #1e293b;
    }
    .form-group {
      margin-bottom: 20px;
    }
    .form-label {
      display: block;
      margin-bottom: 5px;
      font-weight: 600;
      color: #374151;
    }
    .form-input {
      width: 100%;
      padding: 10px 15px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 16px;
      transition: border-color 0.3s ease;
    }
    .form-input:focus {
      outline: none;
      border-color: #3b82f6;
    }
    .form-actions {
      display: flex;
      gap: 15px;
      justify-content: flex-end;
      margin-top: 30px;
    }
    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s ease;
    }
    .btn-primary {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      color: white;
    }
    .btn-secondary {
      background: #f1f5f9;
      color: #64748b;
      border: 2px solid #e5e7eb;
    }
    .btn:hover {
      transform: translateY(-1px);
    }
    .loading {
      opacity: 0.7;
      pointer-events: none;
    }
    .success-message, .error-message {
      padding: 15px 20px;
      border-radius: 8px;
      margin: 20px 0;
      font-weight: 600;
    }
    .success-message {
      background: #d1fae5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    .error-message {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fca5a5;
    }
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #64748b;
    }
    .empty-state-icon {
      font-size: 48px;
      margin-bottom: 15px;
    }
    .user-details-container {
      max-width: 800px;
      margin: 0 auto;
    }
    .user-details-header {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 30px;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      color: white;
    }
    .user-details-avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      font-weight: bold;
      border: 3px solid rgba(255,255,255,0.3);
    }
    .user-details-info h2 {
      margin: 0 0 5px 0;
      font-size: 28px;
    }
    .user-details-info p {
      margin: 0;
      opacity: 0.9;
      font-size: 16px;
    }
    .user-stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .user-stat-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      text-align: center;
      transition: transform 0.2s ease;
    }
    .user-stat-card:hover {
      transform: translateY(-2px);
    }
    .user-stat-label {
      font-size: 14px;
      color: #64748b;
      margin-bottom: 8px;
      font-weight: 500;
    }
    .user-stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #1e293b;
    }
    .user-stat-value.positive { color: #059669; }
    .user-stat-value.negative { color: #dc2626; }
    .transactions-section {
      background: white;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      overflow: hidden;
    }
    .transactions-header {
      padding: 20px;
      background: #f8fafc;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .transaction-filters {
      display: flex;
      gap: 10px;
    }
    .filter-select {
      padding: 8px 12px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      font-size: 14px;
    }
    .transactions-table {
      width: 100%;
      border-collapse: collapse;
    }
    .transactions-table th {
      background: #f8fafc;
      padding: 12px 15px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 1px solid #e5e7eb;
    }
    .transactions-table td {
      padding: 12px 15px;
      border-bottom: 1px solid #f1f5f9;
    }
    .transactions-table tr:hover {
      background: #f8fafc;
    }
    .transaction-type {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
    .transaction-type.deposit { background: #dcfce7; color: #166534; }
    .transaction-type.withdraw { background: #fee2e2; color: #991b1b; }
    .transaction-type.trade { background: #dbeafe; color: #1e40af; }
    .transaction-type.adjustment { background: #fef3c7; color: #92400e; }
    .transaction-amount.positive { color: #059669; font-weight: 600; }
    .transaction-amount.negative { color: #dc2626; font-weight: 600; }
    @media (max-width: 768px) {
      .admin-container { padding: 10px; }
      .admin-header { padding: 20px; flex-direction: column; gap: 20px; text-align: center; }
      .dashboard-tabs { overflow-x: auto; }
      .stats-grid { grid-template-columns: 1fr 1fr; }
      .users-table { font-size: 14px; }
      .users-table th, .users-table td { padding: 10px 15px; }
      .pending-item { flex-direction: column; gap: 15px; align-items: flex-start; }
      .modal-content { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="admin-container">
    <div class="admin-header">
      <div>
        <h1 class="admin-title">⚡ Admin Dashboard</h1>
        <p class="admin-subtitle">TradeX Pro Management Console</p>
      </div>
      <div class="admin-actions">
        <button class="header-btn" onclick="refreshDashboard()">🔄 Refresh</button>
        <button class="header-btn" onclick="exportData()">📊 Export</button>
      </div>
    </div>

    <div class="dashboard-tabs">
      <button class="tab-btn active" onclick="switchTab('overview')">📈 Overview</button>
      <button class="tab-btn" onclick="switchTab('users')">👥 Users</button>
      <button class="tab-btn" onclick="switchTab('deposits')">💰 Deposits</button>
      <button class="tab-btn" onclick="switchTab('system')">⚙️ System</button>
    </div>
    
    <!-- Overview Tab -->
    <div id="overview-tab" class="tab-content active">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-title">Total Users</div>
          <div class="stat-value">${stats.totalUsers}</div>
          <div class="stat-change positive">+${stats.newUsersToday} today</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">Total Balance</div>
          <div class="stat-value">$${stats.totalBalance.toLocaleString()}</div>
          <div class="stat-change">Across all accounts</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">Total Trades</div>
          <div class="stat-value">${stats.totalTrades}</div>
          <div class="stat-change">All time</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">Active Users</div>
          <div class="stat-value">${stats.activeUsers}</div>
          <div class="stat-change positive">Last 24h</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">Pending Deposits</div>
          <div class="stat-value">${pendingDeposits.length}</div>
          <div class="stat-change ${pendingDeposits.length > 0 ? 'negative' : ''}">Awaiting approval</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">Pending Withdrawals</div>
          <div class="stat-value">${pendingWithdrawals.length}</div>
          <div class="stat-change ${pendingWithdrawals.length > 0 ? 'negative' : ''}">Awaiting completion</div>
        </div>
      </div>
      
      ${pendingDeposits.length > 0 ? `
      <div class="pending-deposits">
        <div class="section-header">
          <h2 class="section-title">🔔 Recent Pending Deposits</h2>
        </div>
        ${pendingDeposits.slice(0, 3).map(deposit => `
          <div class="pending-item">
            <div class="pending-info">
              <div class="pending-user">${deposit.user.firstName} ${deposit.user.lastName} (ID: ${deposit.user.id})</div>
              <div class="pending-amount">+$${deposit.amount.toFixed(2)} USDT</div>
              <div class="pending-date">${new Date(deposit.createdAt).toLocaleString()}</div>
            </div>
            <div class="pending-actions">
              <button class="approve-btn" onclick="approveDeposit(${deposit.user.id}, '${deposit.id}')">✅ Approve</button>
            </div>
          </div>
        `).join('')}
      </div>
      ` : ''}
    </div>
    
    <!-- Users Tab -->
    <div id="users-tab" class="tab-content">
      <div class="users-section">
        <div class="section-header">
          <h2 class="section-title">👥 User Management</h2>
          <input type="text" class="search-box" placeholder="Search users..." onkeyup="searchUsers(this.value)">
        </div>
        
        <table class="users-table" id="users-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Email</th>
            <th>Balance</th>
            <th>Deposits</th>
            <th>Withdrawals</th>
            <th>Trades</th>
            <th>P&L</th>
            <th>Transactions</th>
            <th>Joined</th>
            <th>Last Active</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${allUsers.map(user => {
            const userTransactions = user.transactions || [];
            const deposits = userTransactions.filter((t: any) => t.type === 'DEPOSIT');
            const withdrawals = userTransactions.filter((t: any) => t.type === 'WITHDRAW');
            const trades = userTransactions.filter((t: any) => t.type === 'TRADE_PNL');
            
            const totalDeposits = deposits.filter((t: any) => t.status === 'APPROVED').reduce((sum: number, t: any) => sum + t.amount, 0);
            const totalWithdrawals = Math.abs(withdrawals.filter((t: any) => t.status === 'PROCESSING' || t.status === 'COMPLETED').reduce((sum: number, t: any) => sum + t.amount, 0));
            const totalTradePnL = trades.reduce((sum: number, t: any) => sum + t.amount, 0);
            
            return `
            <tr data-user-id="${user.id}">
              <td>
                <div class="user-info">
                  <div class="user-avatar">${user.firstName.charAt(0).toUpperCase()}</div>
                  <div class="user-details">
                    <h4>${user.firstName} ${user.lastName || ''}</h4>
                    <span>ID: ${user.id}</span>
                  </div>
                </div>
              </td>
              <td>${user.email || user.username || 'N/A'}</td>
              <td class="balance-amount">$${user.balance.toFixed(2)}</td>
              <td class="positive">$${totalDeposits.toFixed(2)}</td>
              <td class="negative">$${totalWithdrawals.toFixed(2)}</td>
              <td>${trades.length}</td>
              <td class="${totalTradePnL >= 0 ? 'positive' : 'negative'}">
                ${totalTradePnL >= 0 ? '+' : ''}$${totalTradePnL.toFixed(2)}
              </td>
              <td>${userTransactions.length}</td>
              <td>${new Date(user.createdAt || user.created_at).toLocaleDateString()}</td>
              <td>${new Date(user.updatedAt || user.updated_at).toLocaleDateString()}</td>
              <td class="${user.status === 'active' ? 'status-active' : 'status-blocked'}">
                ${user.status || 'active'}
              </td>
              <td>
                <button class="action-btn" onclick="viewUser('${user.id}')" title="View detailed user information">👁️ View</button>
                <button class="action-btn" onclick="sendMessageToUser('${user.id}', '${user.firstName}')" title="Send message to user">💬 Message</button>
                <button class="action-btn" onclick="editBalance('${user.id}', ${user.balance})" title="Edit user balance">💰 Balance</button>
                <button class="action-btn" onclick="toggleStatus('${user.id}', '${user.status || 'active'}')" title="Block/Unblock user">
                  ${user.status === 'blocked' ? '✅ Unblock' : '🚫 Block'}
                </button>
              </td>
            </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      </div>
    </div>

    <!-- Deposits Tab -->
    <div id="deposits-tab" class="tab-content">
      <div class="pending-deposits">
        <div class="section-header">
          <h2 class="section-title">💰 All Pending Deposits</h2>
          <span class="stat-value">${pendingDeposits.length} pending</span>
        </div>
        ${pendingDeposits.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon">✅</div>
            <div>No pending deposits</div>
            <div style="font-size: 14px; margin-top: 10px; color: #64748b;">All deposits have been processed</div>
          </div>
        ` : pendingDeposits.map(deposit => `
          <div class="pending-item">
            <div class="pending-info">
              <div class="pending-user">${deposit.user.firstName} ${deposit.user.lastName}</div>
              <div style="font-size: 12px; color: #64748b; margin-bottom: 5px;">User ID: ${deposit.user.id} | Current Balance: $${deposit.user.balance.toFixed(2)}</div>
              <div class="pending-amount">+$${deposit.amount.toFixed(2)} USDT</div>
              <div class="pending-date">${new Date(deposit.createdAt).toLocaleString()}</div>
            </div>
            <div class="pending-actions">
              <button class="approve-btn" onclick="approveDeposit(${deposit.user.id}, '${deposit.id}')">✅ Approve</button>
              <button class="reject-btn" onclick="rejectDeposit(${deposit.user.id}, '${deposit.id}')">❌ Reject</button>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Pending Withdrawals Section (Awaiting Approval) -->
      <div class="users-section">
        <div class="section-header">
          <h2 class="section-title">⏳ Withdrawals Awaiting Approval</h2>
          <span class="stat-value">${pendingWithdrawals.length} awaiting approval</span>
        </div>
        ${pendingWithdrawals.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon">✅</div>
            <div>No withdrawals pending approval</div>
            <div style="font-size: 14px; margin-top: 10px; color: #64748b;">All withdrawal requests have been reviewed</div>
          </div>
        ` : pendingWithdrawals.map(withdrawal => `
          <div class="pending-item">
            <div class="pending-info">
              <div class="pending-user">${withdrawal.user.firstName} ${withdrawal.user.lastName}</div>
              <div style="font-size: 12px; color: #64748b; margin-bottom: 5px;">
                User ID: ${withdrawal.user.id} | Current Balance: $${withdrawal.user.balance.toFixed(2)}
                <br>Address: ${withdrawal.metadata?.address || withdrawal.meta?.address || 'N/A'}
              </div>
              <div class="pending-amount" style="color: #dc2626;">$${Math.abs(withdrawal.amount).toFixed(2)} USDT</div>
              <div class="pending-date">${new Date(withdrawal.createdAt).toLocaleString()}</div>
            </div>
            <div class="pending-actions">
              <button class="approve-btn" onclick="approveWithdrawal(${withdrawal.user.id}, '${withdrawal.id}')">✅ Approve</button>
              <button class="reject-btn" onclick="rejectWithdrawal(${withdrawal.user.id}, '${withdrawal.id}')" style="background: #dc2626; margin-left: 10px;">❌ Reject</button>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Approved Withdrawals Section (Ready to Complete) -->
      <div class="users-section">
        <div class="section-header">
          <h2 class="section-title">💸 Approved Withdrawals (Ready to Complete)</h2>
          <span class="stat-value">${approvedWithdrawals.length} ready to complete</span>
        </div>
        ${approvedWithdrawals.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon">✅</div>
            <div>No approved withdrawals pending</div>
            <div style="font-size: 14px; margin-top: 10px; color: #64748b;">All approved withdrawals have been completed</div>
          </div>
        ` : approvedWithdrawals.map(withdrawal => `
          <div class="pending-item">
            <div class="pending-info">
              <div class="pending-user">${withdrawal.user.firstName} ${withdrawal.user.lastName}</div>
              <div style="font-size: 12px; color: #64748b; margin-bottom: 5px;">
                User ID: ${withdrawal.user.id} | Current Balance: $${withdrawal.user.balance.toFixed(2)}
                <br>Address: ${withdrawal.metadata?.address || withdrawal.meta?.address || 'N/A'}
              </div>
              <div class="pending-amount" style="color: #dc2626;">$${Math.abs(withdrawal.amount).toFixed(2)} USDT</div>
              <div class="pending-date">Approved: ${new Date(withdrawal.approvedAt || withdrawal.createdAt).toLocaleString()}</div>
            </div>
            <div class="pending-actions">
              <button class="approve-btn" onclick="completeWithdrawal(${withdrawal.user.id}, '${withdrawal.id}')">✅ Complete</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- System Tab -->
    <div id="system-tab" class="tab-content">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-title">Server Status</div>
          <div class="stat-value positive">🟢 Online</div>
          <div class="stat-change">Cloudflare Workers</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">Database</div>
          <div class="stat-value positive">🟢 Connected</div>
          <div class="stat-change">KV Storage</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">API Health</div>
          <div class="stat-value positive">🟢 Healthy</div>
          <div class="stat-change">All endpoints responsive</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">Last Deploy</div>
          <div class="stat-value">${new Date().toLocaleDateString()}</div>
          <div class="stat-change">Auto-updated</div>
        </div>
      </div>
      
      <div class="users-section">
        <div class="section-header">
          <h2 class="section-title">⚙️ System Actions</h2>
        </div>
        <div style="padding: 30px;">
          <div class="form-group">
            <button class="btn btn-primary" onclick="exportUsers()">📊 Export All User Data</button>
            <p style="font-size: 14px; color: #64748b; margin-top: 10px;">Download CSV file with all user information</p>
          </div>
          <div class="form-group">
            <button class="btn btn-secondary" onclick="systemMaintenance()">🔧 System Maintenance</button>
            <p style="font-size: 14px; color: #64748b; margin-top: 10px;">Perform system cleanup and optimization</p>
          </div>
          <div class="form-group">
            <button class="btn btn-secondary" onclick="viewLogs()">📋 View System Logs</button>
            <p style="font-size: 14px; color: #64748b; margin-top: 10px;">Access recent system activity and errors</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Modals -->
  <div id="user-modal" class="modal">
    <div class="modal-content">
      <div class="modal-header">User Details</div>
      <div id="user-modal-content"></div>
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="closeModal()">Close</button>
      </div>
    </div>
  </div>

  <div id="balance-modal" class="modal">
    <div class="modal-content">
      <div class="modal-header">Edit User Balance</div>
      <div class="form-group">
        <label class="form-label">New Balance ($)</label>
        <input type="number" id="new-balance" class="form-input" step="0.01" min="0">
      </div>
      <div class="form-group">
        <label class="form-label">Reason (Optional)</label>
        <input type="text" id="balance-reason" class="form-input" placeholder="Admin adjustment, bonus, correction, etc.">
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="confirmBalanceUpdate()">Update Balance</button>
      </div>
    </div>
  </div>

  <div id="message-modal" class="modal">
    <div class="modal-content">
      <div class="modal-header">Send Message to User</div>
      <div class="form-group">
        <label class="form-label">Recipient</label>
        <input type="text" id="message-recipient" class="form-input" readonly>
      </div>
      <div class="form-group">
        <label class="form-label">Message</label>
        <textarea id="message-content" class="form-input" rows="5" placeholder="Enter your message here..." style="resize: vertical; min-height: 120px;"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Message Type</label>
        <select id="message-type" class="form-input">
          <option value="info">📋 Information</option>
          <option value="warning">⚠️ Warning</option>
          <option value="success">✅ Success/Confirmation</option>
          <option value="urgent">🚨 Urgent</option>
        </select>
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="confirmSendMessage()">Send Message</button>
      </div>
    </div>
  </div>
  
  <script>
    const adminPassword = new URLSearchParams(window.location.search).get('password') || '*Trader354638#';
    let currentEditUser = null;
    
    // Tab Management
    function switchTab(tabName) {
      // Remove active class from all tabs and content
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
      
      // Add active class to selected tab and content
      document.querySelector(\`button[onclick="switchTab('\${tabName}')"]\`).classList.add('active');
      document.getElementById(tabName + '-tab').classList.add('active');
    }
    
    // User Management Functions
    function searchUsers(query) {
      const table = document.getElementById('users-table');
      const rows = table.querySelectorAll('tbody tr');
      
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const matches = text.includes(query.toLowerCase());
        row.style.display = matches ? '' : 'none';
      });
    }
    
    async function viewUser(userId) {
      try {
        showMessage('Loading user details...', 'info');
        const response = await fetch(\`/api/admin/users?password=\${encodeURIComponent(adminPassword)}\`);
        
        if (!response.ok) {
          throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
        }
        
        const data = await response.json();
        console.log('API Response:', data); // Debug log
        
        if (!data.success) {
          throw new Error(data.error || 'API request failed');
        }
        
        if (!data.data || !data.data.users || !Array.isArray(data.data.users)) {
          throw new Error('Invalid response: users data not found or not an array');
        }
        
        const user = data.data.users.find(u => u.id == userId);
        if (!user) throw new Error('User not found');
        
        // Calculate user statistics
        const transactions = user.transactions || [];
        const deposits = transactions.filter(t => t.type === 'DEPOSIT');
        const withdrawals = transactions.filter(t => t.type === 'WITHDRAW');
        const trades = transactions.filter(t => t.type === 'TRADE_PNL');
        const adjustments = transactions.filter(t => t.type === 'ADJUSTMENT');
        
        const totalDeposits = deposits.filter(t => t.status === 'APPROVED').reduce((sum, t) => sum + t.amount, 0);
        const totalWithdrawals = Math.abs(withdrawals.filter(t => t.status === 'PROCESSING' || t.status === 'COMPLETED').reduce((sum, t) => sum + t.amount, 0));
        const totalTradePnL = trades.reduce((sum, t) => sum + t.amount, 0);
        const totalAdjustments = adjustments.reduce((sum, t) => sum + t.amount, 0);
        
        const winningTrades = trades.filter(t => t.amount > 0).length;
        const losingTrades = trades.filter(t => t.amount < 0).length;
        const winRate = trades.length > 0 ? ((winningTrades / trades.length) * 100).toFixed(1) : '0.0';
        
        const modalContent = document.getElementById('user-modal-content');
        modalContent.innerHTML = \`
          <div class="user-details-container">
            <div class="user-details-header">
              <div class="user-details-avatar">\${user.firstName.charAt(0).toUpperCase()}</div>
              <div class="user-details-info">
                <h2>\${user.firstName} \${user.lastName || ''}</h2>
                <p>User ID: \${user.id} • Email: \${user.email || 'Not provided'}</p>
                <p>Joined \${new Date(user.created_at || user.createdAt).toLocaleDateString()}</p>
                <p>Status: \${user.status || 'active'} • Last Active: \${new Date(user.updated_at || user.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
            
            <div class="user-stats-grid">
              <div class="user-stat-card">
                <div class="user-stat-label">Current Balance</div>
                <div class="user-stat-value">$\${user.balance.toFixed(2)}</div>
              </div>
              <div class="user-stat-card">
                <div class="user-stat-label">Total Deposits</div>
                <div class="user-stat-value positive">$\${totalDeposits.toFixed(2)}</div>
              </div>
              <div class="user-stat-card">
                <div class="user-stat-label">Total Withdrawals</div>
                <div class="user-stat-value negative">$\${totalWithdrawals.toFixed(2)}</div>
              </div>
              <div class="user-stat-card">
                <div class="user-stat-label">Trading P&L</div>
                <div class="user-stat-value \${totalTradePnL >= 0 ? 'positive' : 'negative'}">\${totalTradePnL >= 0 ? '+' : ''}$\${totalTradePnL.toFixed(2)}</div>
              </div>
              <div class="user-stat-card">
                <div class="user-stat-label">Total Trades</div>
                <div class="user-stat-value">\${trades.length}</div>
              </div>
              <div class="user-stat-card">
                <div class="user-stat-label">Win Rate</div>
                <div class="user-stat-value">\${winRate}%</div>
              </div>
            </div>
            
            <div class="transactions-section">
              <div class="transactions-header">
                <h3>Transaction History (\${transactions.length} total)</h3>
                <div class="transaction-filters">
                  <select class="filter-select" onchange="filterUserTransactions(this.value)" id="user-transaction-filter">
                    <option value="all">All Types</option>
                    <option value="DEPOSIT">Deposits</option>
                    <option value="WITHDRAW">Withdrawals</option>
                    <option value="TRADE_PNL">Trades</option>
                    <option value="ADJUSTMENT">Adjustments</option>
                  </select>
                  <select class="filter-select" onchange="sortUserTransactions(this.value)" id="user-transaction-sort">
                    <option value="date-desc">Newest First</option>
                    <option value="date-asc">Oldest First</option>
                    <option value="amount-desc">Highest Amount</option>
                    <option value="amount-asc">Lowest Amount</option>
                  </select>
                </div>
              </div>
              <div style="max-height: 400px; overflow-y: auto;">
                <table class="transactions-table" id="user-transactions-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody id="user-transactions-tbody">
                    \${transactions.sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp)).map(tx => \`
                      <tr data-type="\${tx.type}" data-amount="\${tx.amount}" data-date="\${tx.createdAt || tx.timestamp}">
                        <td>\${new Date(tx.createdAt || tx.timestamp).toLocaleDateString()}</td>
                        <td><span class="transaction-type \${tx.type.toLowerCase()}">\${tx.type}</span></td>
                        <td class="transaction-amount \${tx.amount >= 0 ? 'positive' : 'negative'}">\${tx.amount >= 0 ? '+' : ''}$\${Math.abs(tx.amount).toFixed(2)}</td>
                        <td><span class="status-\${tx.status ? tx.status.toLowerCase().replace('_', '-') : 'unknown'}">\${tx.status || 'Unknown'}</span></td>
                        <td>\${tx.description || tx.type + ' transaction'}</td>
                      </tr>
                    \`).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        \`;
        
        // Store user data for filtering
        window.currentUserTransactions = transactions;
        
        document.getElementById('user-modal').classList.add('active');
        clearMessages();
      } catch (error) {
        showMessage('Error loading user: ' + error.message, 'error');
      }
    }
    
    function filterUserTransactions(type) {
      const tbody = document.getElementById('user-transactions-tbody');
      const rows = tbody.querySelectorAll('tr');
      
      rows.forEach(row => {
        const rowType = row.getAttribute('data-type');
        if (type === 'all' || rowType === type) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    }
    
    function sortUserTransactions(sortBy) {
      const tbody = document.getElementById('user-transactions-tbody');
      const rows = Array.from(tbody.querySelectorAll('tr'));
      
      rows.sort((a, b) => {
        switch(sortBy) {
          case 'date-desc':
            return new Date(b.getAttribute('data-date')) - new Date(a.getAttribute('data-date'));
          case 'date-asc':
            return new Date(a.getAttribute('data-date')) - new Date(b.getAttribute('data-date'));
          case 'amount-desc':
            return Math.abs(parseFloat(b.getAttribute('data-amount'))) - Math.abs(parseFloat(a.getAttribute('data-amount')));
          case 'amount-asc':
            return Math.abs(parseFloat(a.getAttribute('data-amount'))) - Math.abs(parseFloat(b.getAttribute('data-amount')));
          default:
            return 0;
        }
      });
      
      // Re-append sorted rows
      rows.forEach(row => tbody.appendChild(row));
    }
    
    function editBalance(userId, currentBalance) {
      currentEditUser = { id: userId, balance: currentBalance };
      document.getElementById('new-balance').value = currentBalance;
      document.getElementById('balance-reason').value = '';
      document.getElementById('balance-modal').classList.add('active');
    }
    
    async function confirmBalanceUpdate() {
      if (!currentEditUser) return;
      
      const newBalance = parseFloat(document.getElementById('new-balance').value);
      const reason = document.getElementById('balance-reason').value.trim();
      
      if (isNaN(newBalance) || newBalance < 0) {
        showMessage('Please enter a valid balance amount', 'error');
        return;
      }
      
      try {
        document.querySelector('.modal-content').classList.add('loading');
        
        const response = await fetch(\`/api/admin/user/balance?password=\${encodeURIComponent(adminPassword)}\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: parseInt(currentEditUser.id),
            newBalance: newBalance,
            reason: reason || 'Admin balance adjustment'
          })
        });
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        
        showMessage(\`Balance updated successfully! New balance: $\${newBalance.toFixed(2)}\`, 'success');
        closeModal();
        setTimeout(() => location.reload(), 1500);
        
      } catch (error) {
        showMessage('Error updating balance: ' + error.message, 'error');
      } finally {
        document.querySelector('.modal-content').classList.remove('loading');
      }
    }
    
    async function toggleStatus(userId, currentStatus) {
      const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
      const action = newStatus === 'blocked' ? 'block' : 'unblock';
      
      if (!confirm(\`Are you sure you want to \${action} user \${userId}?\`)) return;
      
      try {
        showMessage(\`\${action.charAt(0).toUpperCase() + action.slice(1)}ing user...\`, 'info');
        
        const response = await fetch(\`/api/admin/user/status?password=\${encodeURIComponent(adminPassword)}\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: parseInt(userId),
            status: newStatus,
            reason: \`Admin \${action} action\`
          })
        });
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        
        showMessage(\`User \${action}ed successfully!\`, 'success');
        setTimeout(() => location.reload(), 1500);
        
      } catch (error) {
        showMessage('Error updating user status: ' + error.message, 'error');
      }
    }
    
    // Message Management
    let currentMessageUser = null;
    
    function sendMessageToUser(userId, userName) {
      currentMessageUser = { id: userId, name: userName };
      document.getElementById('message-recipient').value = \`\${userName} (ID: \${userId})\`;
      document.getElementById('message-content').value = '';
      document.getElementById('message-type').value = 'info';
      document.getElementById('message-modal').classList.add('active');
    }
    
    async function confirmSendMessage() {
      console.log('confirmSendMessage called');
      if (!currentMessageUser) {
        console.log('No currentMessageUser');
        showMessage('No user selected', 'error');
        return;
      }
      
      const messageContentEl = document.getElementById('message-content');
      const messageTypeEl = document.getElementById('message-type');
      
      if (!messageContentEl || !messageTypeEl) {
        console.error('Message form elements not found');
        showMessage('Form elements not found', 'error');
        return;
      }
      
      const messageContent = messageContentEl.value.trim();
      const messageType = messageTypeEl.value;
      
      console.log('Message content:', messageContent);
      console.log('Message type:', messageType);
      
      if (!messageContent) {
        showMessage('Please enter a message', 'error');
        return;
      }
      
      try {
        document.querySelector('.modal-content').classList.add('loading');
        
        const response = await fetch(\`/api/admin/send-message?password=\${encodeURIComponent(adminPassword)}\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: parseInt(currentMessageUser.id),
            message: messageContent,
            type: messageType
          })
        });
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (!data.success) {
          console.log('API error:', data.error);
          throw new Error(data.error || 'Unknown API error');
        }
        
        showMessage(\`Message sent successfully to \${currentMessageUser.name}!\`, 'success');
        closeModal();
        
      } catch (error) {
        console.error('Error sending message:', error);
        showMessage('Error sending message: ' + error.message, 'error');
      } finally {
        document.querySelector('.modal-content').classList.remove('loading');
      }
    }
    
    // Deposit Management
    async function approveDeposit(userId, transactionId) {
      if (!confirm('Are you sure you want to approve this deposit?')) return;
      
      try {
        showMessage('Approving deposit...', 'info');
        
        const response = await fetch('/api/approve-deposit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: parseInt(userId),
            transactionId: transactionId
          })
        });
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        
        showMessage(\`Deposit approved! New balance: $\${data.newBalance.toFixed(2)}\`, 'success');
        setTimeout(() => location.reload(), 1500);
        
      } catch (error) {
        showMessage('Error approving deposit: ' + error.message, 'error');
      }
    }
    
    function rejectDeposit(userId, transactionId) {
      const reason = prompt('Enter rejection reason (optional):');
      if (reason === null) return; // User cancelled
      
      fetch(\`/api/admin/reject-deposit?password=\${encodeURIComponent(adminPassword)}\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          depositId: transactionId,
          reason: reason || 'Rejected by admin'
        })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          showMessage('Deposit rejected successfully!', 'success');
          refreshDashboard();
        } else {
          showMessage(data.error || 'Failed to reject deposit', 'error');
        }
      })
      .catch(error => {
        console.error('Error rejecting deposit:', error);
        showMessage('Failed to reject deposit', 'error');
      });
    }

    // Withdrawal Management
    async function approveWithdrawal(userId, transactionId) {
      if (!confirm('Are you sure you want to approve this withdrawal?\\nThis will deduct the amount from the user\\'s balance.')) return;
      
      try {
        showMessage('Approving withdrawal...', 'info');
        
        const response = await fetch('/api/approve-withdraw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: parseInt(userId),
            transactionId: transactionId
          })
        });
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        
        showMessage(\`Withdrawal approved! New balance: $\${data.newBalance.toFixed(2)}\`, 'success');
        setTimeout(() => location.reload(), 1500);
        
      } catch (error) {
        showMessage('Error approving withdrawal: ' + error.message, 'error');
      }
    }
    
    function rejectWithdrawal(userId, transactionId) {
      const reason = prompt('Enter rejection reason (optional):');
      if (reason === null) return; // User cancelled
      
      if (!confirm('Are you sure you want to reject this withdrawal?')) return;
      
      fetch(\`/api/admin/reject-withdraw?password=\${encodeURIComponent(adminPassword)}\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          withdrawalId: transactionId,
          reason: reason || 'Rejected by admin'
        })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          showMessage('Withdrawal rejected successfully!', 'success');
          refreshDashboard();
        } else {
          showMessage(data.error || 'Failed to reject withdrawal', 'error');
        }
      })
      .catch(error => {
        console.error('Error rejecting withdrawal:', error);
        showMessage('Failed to reject withdrawal', 'error');
      });
    }

    async function completeWithdrawal(userId, withdrawalId) {
      const txHash = prompt('Enter transaction hash (optional):');
      if (txHash === null) return; // User cancelled
      
      if (!confirm('Are you sure you want to mark this withdrawal as completed?')) return;
      
      try {
        showMessage('Completing withdrawal...', 'info');
        
        const response = await fetch(\`/api/admin/complete-withdrawal?password=\${encodeURIComponent(adminPassword)}\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: parseInt(userId),
            withdrawalId: withdrawalId,
            txHash: txHash || undefined
          })
        });
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        
        showMessage('Withdrawal completed successfully!', 'success');
        refreshDashboard();
        
      } catch (error) {
        console.error('Error completing withdrawal:', error);
        showMessage('Failed to complete withdrawal: ' + error.message, 'error');
      }
    }
    
    // Utility Functions
    function closeModal() {
      document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('active'));
      currentEditUser = null;
    }
    
    function showMessage(message, type = 'info') {
      clearMessages();
      const messageEl = document.createElement('div');
      messageEl.className = type === 'error' ? 'error-message' : 'success-message';
      messageEl.textContent = message;
      document.querySelector('.admin-container').insertBefore(messageEl, document.querySelector('.admin-container').firstChild);
      
      if (type !== 'error') {
        setTimeout(clearMessages, 5000);
      }
    }
    
    function clearMessages() {
      document.querySelectorAll('.success-message, .error-message').forEach(el => el.remove());
    }
    
    function refreshDashboard() {
      location.reload();
    }
    
    function exportData() {
      alert('Data export feature coming soon...');
    }
    
    function exportUsers() {
      alert('User export feature coming soon...');
    }
    
    function systemMaintenance() {
      alert('System maintenance feature coming soon...');
    }
    
    function viewLogs() {
      alert('System logs feature coming soon...');
    }
    
    // Event Listeners
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        closeModal();
      }
    });
    
    // Auto-refresh every 2 minutes
    setTimeout(() => {
      location.reload();
    }, 120000);
    
    // Initialize
    console.log('Admin Dashboard Loaded');
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

async function getAllUsers(env: Env): Promise<any[]> {
  try {
    const users: any[] = [];
    const list = await env.TRADING_KV.list({ prefix: 'user:' });
    
    for (const key of list.keys) {
      try {
        const userData = await env.TRADING_KV.get(key.name);
        if (userData) {
          const user = JSON.parse(userData);
          
          // Ensure all required fields exist
          user.firstName = user.firstName || 'Unknown';
          user.lastName = user.lastName || '';
          user.balance = user.balance || 0;
          user.status = user.status || 'active';
          user.created_at = user.created_at || user.createdAt || new Date().toISOString();
          user.updated_at = user.updated_at || user.updatedAt || new Date().toISOString();
          user.transactions = user.transactions || [];
          
          // Calculate statistics
          const tradeTransactions = user.transactions.filter((t: any) => t.type === 'TRADE_PNL');
          user.trades = tradeTransactions.length;
          user.pnl = user.balance - 10000; // P&L from starting balance
          
          // Calculate total P&L from trade transactions
          const tradePnL = tradeTransactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
          user.tradePnL = tradePnL;
          
          users.push(user);
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    
    return users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

async function getAdminStats(env: Env, users: any[]): Promise<any> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  return {
    totalUsers: users.length,
    newUsersToday: users.filter(u => new Date(u.createdAt) >= today).length,
    totalBalance: users.reduce((sum, u) => sum + (u.balance || 0), 0),
    totalTrades: users.reduce((sum, u) => sum + (u.trades || 0), 0),
    activeUsers: users.filter(u => u.status !== 'blocked').length
  };
}

// getUserData / saveUserData centralized in data/users.ts

