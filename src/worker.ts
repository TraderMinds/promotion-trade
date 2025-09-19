/// <reference types="@cloudflare/workers-types" />
import { getUserState, appendTrade, saveUserState } from './logic/storage.js';
import { runTrade, simulateTicks, mockAISignal, getRealPrice, runRealTrade } from './logic/pricing.js';
import { calculateUserStats, checkAchievements, calculatePortfolioMetrics, ACHIEVEMENTS } from './logic/features.js';

interface Env {
  TRADING_KV: KVNamespace;
  TELEGRAM_BOT_TOKEN: string;
  BASE_URL: string;
  MINIAPP_URL: string;
}

interface TelegramUpdate {
  message?: {
    message_id: number;
    chat: { id: number; type: string; };
    from?: { id: number; first_name?: string; username?: string };
    text?: string;
    date: number;
  };
  // other fields ignored for brevity
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/') {
      return new Response('Promotion Trade Bot Worker', { status: 200 });
    }

    if (url.pathname === '/webhook' && req.method === 'POST') {
      const update: TelegramUpdate = await req.json();
      if (update.message && update.message.text) {
        return await handleTelegram(update, env);
      }
      return new Response('ok');
    }

    if (url.pathname.startsWith('/api/')) {
      return await handleApi(req, env);
    }

    if (url.pathname.startsWith('/miniapp')) {
      return serveMiniApp(url, env);
    }

    return new Response('Not found', { status: 404 });
  }
};

async function handleTelegram(update: TelegramUpdate, env: Env): Promise<Response> {
  const msg = update.message!;
  const chatId = msg.chat.id;
  const text = msg.text || '';

  if (text.startsWith('/start')) {
    const startPayload = JSON.stringify({ url: env.MINIAPP_URL });
    const reply = `Welcome! Tap the button below to open the trading mini app.`;
    await sendTelegram(env, 'sendMessage', {
      chat_id: chatId,
      text: reply,
      reply_markup: {
        inline_keyboard: [[{ text: 'Open Trading Mini App', web_app: { url: env.MINIAPP_URL } }]]
      }
    });
    return new Response('ok');
  }

  await sendTelegram(env, 'sendMessage', { chat_id: chatId, text: 'Use /start to begin.' });
  return new Response('ok');
}

async function handleApi(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  
  // Price endpoint doesn't require user authentication
  if (url.pathname === '/api/price') {
    try {
      const realPrice = await getRealPrice();
      const ticks = simulateTicks(Date.now(), realPrice.price, 5);
      const signal = mockAISignal(ticks);
      
      return json({
        current: {
          price: realPrice.price,
          source: realPrice.source,
          timestamp: realPrice.timestamp
        },
        signal,
        ticks: ticks.slice(-5),
        confidence: Math.random() > 0.5 ? 'High' : 'Medium'
      });
    } catch (error) {
      return json({ error: 'Price fetch failed' }, 500);
    }
  }

  // All other endpoints require user authentication
  const userId = parseInt(url.searchParams.get('user') || '0', 10) || 0;
  if (!userId) return json({ error: 'user param required' }, 400);

  if (url.pathname === '/api/state') {
    const state = await getUserState(env, userId);
    return json(state);
  }

  if (url.pathname === '/api/deposit' && req.method === 'POST') {
    const depositBody = await req.json().catch(() => ({ amount: 0 })) as { amount?: number };
    const amount = depositBody.amount ?? 0;
    if (!amount || amount <= 0) return json({ error: 'invalid amount' }, 400);
    const state = await getUserState(env, userId);
    state.balance = +(state.balance + amount).toFixed(2);
    await saveUserState(env, state);
    return json(state);
  }

  if (url.pathname === '/api/price') {
    try {
      const realPrice = await getRealPrice();
      const ticks = simulateTicks(Date.now(), realPrice.price, 5);
      const signal = mockAISignal(ticks);
      
      return json({
        current: {
          price: realPrice.price,
          source: realPrice.source,
          timestamp: realPrice.timestamp
        },
        signal,
        ticks: ticks.slice(-5),
        confidence: Math.random() > 0.5 ? 'High' : 'Medium'
      });
    } catch (error) {
      return json({ error: 'Price fetch failed' }, 500);
    }
  }

  if (url.pathname === '/api/price-stream') {
    // Server-sent events for real-time price updates
    const response = new Response(
      new ReadableStream({
        start(controller) {
          const sendPrice = async () => {
            try {
              const realPrice = await getRealPrice();
              const data = `data: ${JSON.stringify({
                price: realPrice.price,
                source: realPrice.source,
                timestamp: Date.now()
              })}\n\n`;
              controller.enqueue(new TextEncoder().encode(data));
            } catch (error) {
              console.error('Stream error:', error);
            }
          };
          
          // Send initial price
          sendPrice();
          
          // Send price updates every 3 seconds
          const interval = setInterval(sendPrice, 3000);
          
          // Clean up after 5 minutes
          setTimeout(() => {
            clearInterval(interval);
            controller.close();
          }, 300000);
        }
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Cache-Control'
        }
      }
    );
    return response;
  }

  if (url.pathname === '/api/trade' && req.method === 'POST') {
    const body = await req.json().catch(() => ({})) as { amount?: number; direction?: string };
    const amount = Number(body.amount ?? 0) || 0;
    const direction = body.direction || 'BUY';
    
    if (amount <= 0) return json({ error: 'invalid amount' }, 400);
    const state = await getUserState(env, userId);
    if (amount > state.balance) return json({ error: 'insufficient balance' }, 400);
    
    try {
      const seed = (Date.now() / 1000 | 0) + userId;
      const result = await runRealTrade(seed, amount);
      
      const trade = {
        id: crypto.randomUUID(),
        ts: Date.now(),
        amount,
        direction: result.direction,
        entryPrice: result.entryPrice,
        exitPrice: result.exitPrice,
        profit: result.profit,
        realPrice: result.realPrice,
        priceSource: result.priceSource
      };
      
      state.balance = +(state.balance + result.profit).toFixed(2);
      await appendTrade(env, userId, trade);
      await saveUserState(env, state);
      
      return json({ 
        trade, 
        ticks: result.ticks,
        newBalance: state.balance,
        realPriceData: {
          price: result.realPrice,
          source: result.priceSource
        }
      });
    } catch (error) {
      console.error('Trade execution error:', error);
      return json({ error: 'Trade execution failed' }, 500);
    }
  }

  if (url.pathname === '/api/stats') {
    const state = await getUserState(env, userId);
    const stats = calculateUserStats(state.trades);
    const portfolio = calculatePortfolioMetrics(state.trades, 10000);
    const achievements = checkAchievements(stats, state.achievements || []);
    
    return json({
      stats,
      portfolio,
      availableAchievements: ACHIEVEMENTS,
      unlockedAchievements: state.achievements || [],
      newAchievements: achievements
    });
  }

  if (url.pathname === '/api/achievements' && req.method === 'POST') {
    const body = await req.json().catch(() => ({})) as { achievementId?: string };
    const achievementId = body.achievementId;
    
    if (!achievementId) return json({ error: 'Missing achievement ID' }, 400);
    
    const state = await getUserState(env, userId);
    const stats = calculateUserStats(state.trades);
    const newAchievements = checkAchievements(stats, state.achievements || []);
    
    const achievement = newAchievements.find(a => a.id === achievementId);
    if (!achievement) return json({ error: 'Achievement not available' }, 400);
    
    // Add achievement and reward
    state.achievements = state.achievements || [];
    state.achievements.push(achievementId);
    state.balance = +(state.balance + achievement.reward).toFixed(2);
    
    await saveUserState(env, state);
    
    return json({
      achievement,
      newBalance: state.balance,
      message: `Congratulations! You earned $${achievement.reward}!`
    });
  }

  if (url.pathname === '/api/leaderboard') {
    // For demo purposes, generate sample leaderboard
    const sampleLeaderboard = [
      { userId: 1, username: 'CryptoKing', totalProfit: 5420.50, winRate: 0.78, totalTrades: 89, rank: 1 },
      { userId: 2, username: 'TradeQueen', totalProfit: 4890.25, winRate: 0.72, totalTrades: 156, rank: 2 },
      { userId: 3, username: 'AITrader', totalProfit: 4320.75, winRate: 0.69, totalTrades: 203, rank: 3 },
      { userId: userId, username: 'You', totalProfit: calculateUserStats((await getUserState(env, userId)).trades).totalProfit, winRate: 0.65, totalTrades: (await getUserState(env, userId)).trades.length, rank: 4 }
    ];
    
    return json({ leaderboard: sampleLeaderboard });
  }

  // User management endpoints
  if (url.pathname.startsWith('/api/user/')) {
    const userIdFromPath = parseInt(url.pathname.split('/')[3], 10);
    
    if (req.method === 'GET') {
      // Get user data
      try {
        const userData = await env.TRADING_KV.get(`user_${userIdFromPath}`);
        if (!userData) {
          return json({ error: 'User not found' }, 404);
        }
        return json(JSON.parse(userData));
      } catch (error) {
        return json({ error: 'Failed to load user data' }, 500);
      }
    }
    
    if (req.method === 'PUT') {
      // Update user data
      try {
        const userData = await req.json();
        await env.TRADING_KV.put(`user_${userIdFromPath}`, JSON.stringify(userData));
        return json({ success: true });
      } catch (error) {
        return json({ error: 'Failed to save user data' }, 500);
      }
    }
  }
  
  if (url.pathname === '/api/user' && req.method === 'POST') {
    // Create new user
    try {
      const userData = await req.json() as any;
      const userId = userData.id;
      
      // Check if user already exists
      const existingUser = await env.TRADING_KV.get(`user_${userId}`);
      if (existingUser) {
        return json({ error: 'User already exists' }, 409);
      }
      
      // Create new user record
      await env.TRADING_KV.put(`user_${userId}`, JSON.stringify(userData));
      
      return json({ success: true, userId });
    } catch (error) {
      return json({ error: 'Failed to create user' }, 500);
    }
  }

  return json({ error: 'unknown endpoint' }, 404);
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}

async function sendTelegram(env: Env, method: string, payload: any) {
  const token = env.TELEGRAM_BOT_TOKEN;
  // In demo we just pretend success if no real token
  if (!token || token === 'dummy') return { ok: true, mocked: true };
  const resp = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return resp.json();
}

function serveMiniApp(url: URL, env: Env): Response {
  if (url.pathname === '/miniapp' || url.pathname === '/miniapp/') {
    return new Response(MINIAPP_HTML(env), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
  if (url.pathname === '/miniapp/app.js') {
    return new Response('// JavaScript is now included in HTML', { 
      headers: { 'Content-Type': 'application/javascript; charset=utf-8' } 
    });
  }
  return new Response('Not found', { status: 404 });
}

function MINIAPP_HTML(env: Env) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TradeX Pro - AI Trading Bot</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff;
            font-size: 14px;
            line-height: 1.4;
        }
        
        .container {
            max-width: 100vw;
            padding: 8px;
        }
        
        .header {
            text-align: center;
            padding: 8px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            margin-bottom: 8px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .header h1 {
            font-size: 1.4rem;
            margin-bottom: 2px;
        }
        
        .header p {
            font-size: 0.8rem;
            opacity: 0.9;
        }
        
        .balance-card {
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            padding: 12px;
            margin-bottom: 8px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            text-align: center;
        }
        
        .balance-amount {
            font-size: 1.8rem;
            font-weight: bold;
            margin: 5px 0;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .wallet-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-top: 8px;
        }
        
        .wallet-btn {
            padding: 8px 12px;
            border: none;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 12px;
        }
        
        .deposit-btn {
            background: linear-gradient(45deg, #4CAF50, #45a049);
            color: white;
        }
        
        .withdraw-btn {
            background: linear-gradient(45deg, #f44336, #da190b);
            color: white;
        }
        
        .chart-container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            padding: 12px;
            margin-bottom: 8px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            height: 180px;
        }
        
        .price-info {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 8px;
            margin-bottom: 8px;
        }
        
        .price-card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 10px;
            padding: 8px;
            text-align: center;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .price-value {
            font-size: 1rem;
            font-weight: bold;
            margin: 2px 0;
        }
        
        .price-label {
            font-size: 0.7rem;
            opacity: 0.8;
        }
        
        .ai-signal {
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            padding: 12px;
            margin-bottom: 8px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            text-align: center;
        }
        
        .signal-indicator {
            font-size: 2rem;
            margin: 5px 0;
        }
        
        .signal-buy {
            color: #4CAF50;
        }
        
        .signal-sell {
            color: #f44336;
        }
        
        .amount-input {
            width: 100%;
            padding: 10px;
            border: none;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.1);
            color: white;
            font-size: 14px;
            margin-bottom: 8px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .amount-input::placeholder {
            color: rgba(255, 255, 255, 0.6);
        }
        
        .trading-controls {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 8px;
        }
        
        .trade-btn {
            padding: 12px;
            border: none;
            border-radius: 12px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .buy-btn {
            background: linear-gradient(45deg, #4CAF50, #45a049);
            color: white;
        }
        
        .sell-btn {
            background: linear-gradient(45deg, #f44336, #da190b);
            color: white;
        }
        
        .trade-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        
        .trade-progress {
            display: none;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            padding: 15px;
            text-align: center;
            margin-bottom: 8px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .trade-header {
            font-size: 1rem;
            font-weight: bold;
            margin-bottom: 8px;
            opacity: 0.9;
        }
        
        .trade-details {
            margin: 10px 0;
        }
        
        .trade-info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            padding: 5px 0;
        }
        
        .trade-direction {
            font-weight: bold;
            padding: 3px 8px;
            border-radius: 6px;
            font-size: 0.8rem;
        }
        
        .trade-direction.buy {
            background: rgba(76, 175, 80, 0.3);
            color: #4CAF50;
        }
        
        .trade-direction.sell {
            background: rgba(244, 67, 54, 0.3);
            color: #f44336;
        }
        
        .trade-amount {
            font-weight: bold;
            font-size: 0.9rem;
        }
        
        .price-movement {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin: 8px 0;
            padding: 8px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
        }
        
        .price-row {
            display: flex;
            justify-content: space-between;
            font-size: 0.8rem;
            padding: 2px 0;
        }
        
        .price-row span:first-child {
            opacity: 0.8;
        }
        
        .price-row span:last-child {
            font-weight: bold;
        }
        
        .profit-display {
            margin-top: 10px;
        }
        
        .live-percent {
            font-size: 0.9rem;
            font-weight: bold;
            margin-top: 3px;
            opacity: 0.9;
        }
        
        .progress-timer {
            font-size: 2rem;
            font-weight: bold;
            margin: 10px 0;
            color: #FFD700;
        }
        
        .live-pnl {
            font-size: 1.5rem;
            font-weight: bold;
            margin: 8px 0;
        }
        
        .profit {
            color: #4CAF50;
        }
        
        .loss {
            color: #f44336;
        }
        
        .trade-result {
            display: none;
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            padding: 15px;
            text-align: center;
            margin-bottom: 8px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .result-details {
            margin: 15px 0;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            padding: 10px;
        }
        
        .profit-row, .balance-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 8px 0;
            padding: 3px 0;
        }
        
        .profit-row span, .balance-row span {
            font-size: 0.9rem;
            opacity: 0.8;
        }
        
        .final-balance {
            font-size: 1.1rem;
            font-weight: bold;
            color: #4CAF50;
        }
        
        .result-icon {
            font-size: 2.5rem;
            margin: 10px 0;
        }
        
        .win-icon {
            color: #4CAF50;
        }
        
        .lose-icon {
            color: #f44336;
        }
        
        .statistics {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            padding: 12px;
            margin-bottom: 8px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 8px;
            text-align: center;
        }
        
        .stat-item {
            padding: 5px;
        }
        
        .stat-value {
            font-size: 1rem;
            font-weight: bold;
            margin-bottom: 2px;
        }
        
        .stat-label {
            font-size: 0.7rem;
            opacity: 0.8;
        }
        
        .footer {
            text-align: center;
            padding: 10px;
            opacity: 0.8;
            font-size: 0.7rem;
        }
        
        .loading {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255,255,255,.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 1s ease-in-out infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        /* Compact mode for very small screens */
        @media (max-height: 600px) {
            .container {
                padding: 5px;
            }
            
            .chart-container {
                height: 120px;
            }
            
            .balance-amount {
                font-size: 1.5rem;
            }
            
            .signal-indicator {
                font-size: 1.5rem;
            }
            
            .statistics {
                display: none;
            }
        }
    </style>
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 TradeX Pro</h1>
            <p>AI-Powered Trading Bot</p>
        </div>
        
        <div class="balance-card">
            <div class="price-label">Your Balance</div>
            <div class="balance-amount" id="balance">$10,000.00</div>
            <div class="wallet-actions">
                <button class="wallet-btn deposit-btn" onclick="showDeposit()">
                    💰 Deposit
                </button>
                <button class="wallet-btn withdraw-btn" onclick="showWithdraw()">
                    💸 Withdraw
                </button>
            </div>
        </div>
        
        <div class="chart-container">
            <canvas id="priceChart"></canvas>
        </div>
        
        <div class="price-info">
            <div class="price-card">
                <div class="price-label">Current Price</div>
                <div class="price-value" id="currentPrice">Loading...</div>
                <div class="price-label" id="priceSource">Real-time</div>
            </div>
            <div class="price-card">
                <div class="price-label">24h Change</div>
                <div class="price-value" id="priceChange">+2.45%</div>
                <div class="price-label">BTC/USD</div>
            </div>
        </div>
        
        <div class="ai-signal">
            <div class="price-label">AI Recommendation</div>
            <div class="signal-indicator" id="aiSignal">🤖</div>
            <div id="signalText">Analyzing market...</div>
            <div class="price-label" id="signalConfidence">Confidence: --</div>
        </div>
        
        <input type="number" class="amount-input" id="tradeAmount" placeholder="Enter amount ($100 - $1000)" min="100" max="1000" value="100">
        
        <div class="trading-controls">
            <button class="trade-btn buy-btn" onclick="executeTrade('BUY')" id="buyBtn">
                📈 BUY
            </button>
            <button class="trade-btn sell-btn" onclick="executeTrade('SELL')" id="sellBtn">
                📉 SELL
            </button>
        </div>
        
        <div class="trade-progress" id="tradeProgress">
            <div class="trade-header">Trade in Progress</div>
            <div class="progress-timer" id="timer">20</div>
            <div class="trade-details">
                <div class="trade-info-row">
                    <span class="trade-direction" id="tradeDirection">BUY</span>
                    <span class="trade-amount" id="tradeAmountDisplay">$0</span>
                </div>
                <div class="price-movement">
                    <div class="price-row">
                        <span>Entry:</span>
                        <span id="entryPrice">$0</span>
                    </div>
                    <div class="price-row">
                        <span>Current:</span>
                        <span id="currentPrice">$0</span>
                    </div>
                </div>
                <div class="profit-display">
                    <div class="live-pnl" id="livePnl">$0.00</div>
                    <div class="live-percent" id="livePercent">0.00%</div>
                </div>
            </div>
            <canvas id="liveChart" style="max-height: 150px;"></canvas>
        </div>
        
        <div class="trade-result" id="tradeResult">
            <div class="result-icon" id="resultIcon">🎉</div>
            <div id="resultText">Congratulations!</div>
            <div class="result-details">
                <div class="profit-row">
                    <span>Profit:</span>
                    <div class="live-pnl" id="finalPnl">+$25.50</div>
                </div>
                <div class="profit-row">
                    <span>Return:</span>
                    <div class="live-percent" id="profitPercent">+2.55%</div>
                </div>
                <div class="balance-row">
                    <span>New Balance:</span>
                    <div class="final-balance" id="finalBalance">$10,025.50</div>
                </div>
            </div>
            <button class="trade-btn buy-btn" onclick="resetTrade()" style="margin-top: 15px; width: 100%;">
                Trade Again
            </button>
        </div>
        
        <div class="statistics">
            <h3 style="text-align: center; margin-bottom: 15px;">📊 Your Stats</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value" id="totalTrades">0</div>
                    <div class="stat-label">Total Trades</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="winRate">0%</div>
                    <div class="stat-label">Win Rate</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="totalProfit">$0</div>
                    <div class="stat-label">Total Profit</div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>Powered by AI • Real-time data from multiple sources</p>
            <p>⚡ Built with Cloudflare Workers</p>
        </div>
    </div>

    <script>
        // Initialize Telegram WebApp
        const tg = window.Telegram?.WebApp;
        let telegramUser = null;
        let userId = 12345; // Default for demo
        let currentTrade = null;
        let priceChart = null;
        let liveChart = null;
        let userData = { balance: 10000, trades: [], stats: { total: 0, wins: 0, profit: 0 } };

        // Initialize Telegram WebApp
        function initTelegramAuth() {
            if (tg) {
                tg.ready();
                tg.expand();
                
                // Get user data from Telegram
                if (tg.initDataUnsafe?.user) {
                    telegramUser = tg.initDataUnsafe.user;
                    userId = telegramUser.id;
                    
                    // Update header with user info
                    updateUserDisplay();
                    
                    // Load user data from server
                    loadUserData();
                } else {
                    // Running outside Telegram - use demo mode
                    console.log('Running in demo mode outside Telegram');
                }
                
                // Set main button for quick actions
                tg.MainButton.setText('💰 Quick Deposit $100');
                tg.MainButton.onClick(() => quickDeposit(100));
                tg.MainButton.show();
            }
        }
        
        // Update UI with user information
        function updateUserDisplay() {
            if (telegramUser) {
                const headerEl = document.querySelector('.header h1');
                const userInfoEl = document.querySelector('.header p');
                
                headerEl.textContent = '🚀 Welcome ' + (telegramUser.first_name || 'Trader');
                userInfoEl.textContent = 'AI Trading Bot • @' + (telegramUser.username || 'User');
            }
        }
        
        // Load user-specific data
        async function loadUserData() {
            if (!userId || userId === 12345) return;
            
            try {
                const response = await fetch('/api/user/' + userId);
                if (response.ok) {
                    const serverUserData = await response.json();
                    userData = { ...userData, ...serverUserData };
                    
                    // Update balance display
                    document.getElementById('balance').textContent = '$' + userData.balance.toFixed(2);
                    updateStats();
                } else {
                    // New user - create account
                    await createUserAccount();
                }
            } catch (error) {
                console.error('Error loading user data:', error);
            }
        }
        
        // Create new user account
        async function createUserAccount() {
            if (!telegramUser) return;
            
            const newUserData = {
                id: userId,
                telegramData: telegramUser,
                balance: 10000, // Starting balance
                trades: [],
                stats: { total: 0, wins: 0, profit: 0 },
                createdAt: new Date().toISOString()
            };
            
            try {
                const response = await fetch('/api/user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newUserData)
                });
                
                if (response.ok) {
                    userData = newUserData;
                    console.log('User account created successfully');
                }
            } catch (error) {
                console.error('Error creating user account:', error);
            }
        }
        
        // Save user data to server
        async function saveUserData() {
            if (!userId || userId === 12345) return;
            
            try {
                await fetch('/api/user/' + userId, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });
            } catch (error) {
                console.error('Error saving user data:', error);
            }
        }
        
        // Quick deposit function
        function quickDeposit(amount) {
            userData.balance += amount;
            document.getElementById('balance').textContent = '$' + userData.balance.toFixed(2);
            saveUserData();
            
            if (tg) {
                tg.showAlert('Successfully deposited $' + amount + '!');
            }
        }

        // Initialize charts with trade marker support
        async function initCharts() {
            const chartCtx = document.getElementById('priceChart').getContext('2d');
            priceChart = new Chart(chartCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'BTC/USD',
                        data: [],
                        borderColor: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true
                    }, {
                        label: 'Trade Entry',
                        data: [],
                        borderColor: '#FFD700',
                        backgroundColor: '#FFD700',
                        pointRadius: 8,
                        pointHoverRadius: 10,
                        showLine: false,
                        pointStyle: 'triangle'
                    }, {
                        label: 'Trade Exit',
                        data: [],
                        borderColor: '#FF6B6B',
                        backgroundColor: '#FF6B6B',
                        pointRadius: 8,
                        pointHoverRadius: 10,
                        showLine: false,
                        pointStyle: 'rect'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    if (context.datasetIndex === 1) {
                                        return 'Entry: $' + context.parsed.y.toLocaleString();
                                    } else if (context.datasetIndex === 2) {
                                        return 'Exit: $' + context.parsed.y.toLocaleString();
                                    }
                                    return 'Price: $' + context.parsed.y.toLocaleString();
                                }
                            }
                        }
                    },
                    scales: {
                        x: { display: false },
                        y: {
                            grid: { color: 'rgba(255,255,255,0.1)' },
                            ticks: { color: 'white' }
                        }
                    }
                }
            });
        }
        
        // Add trade markers to chart
        function addTradeMarker(price, type, time) {
            if (!priceChart) return;
            
            const datasetIndex = type === 'entry' ? 1 : 2;
            const timeLabel = new Date(time).toLocaleTimeString();
            
            // Add marker to chart
            priceChart.data.datasets[datasetIndex].data.push({
                x: priceChart.data.labels.length - 1,
                y: price
            });
            
            priceChart.update('none');
        }

        // Fetch real price data
        async function fetchRealPrice() {
            try {
                const response = await fetch('/api/price');
                const data = await response.json();
                return data;
            } catch (error) {
                console.error('Price fetch error:', error);
                return { current: { price: 65000 }, signal: 'BUY' };
            }
        }

        // Update price display
        async function updatePriceDisplay() {
            const priceData = await fetchRealPrice();
            document.getElementById('currentPrice').textContent = '$' + priceData.current.price.toLocaleString();
            document.getElementById('priceSource').textContent = priceData.current.source || 'Real-time';
            
            // Update AI signal
            const signal = priceData.signal;
            const signalEl = document.getElementById('aiSignal');
            const signalTextEl = document.getElementById('signalText');
            
            if (signal === 'BUY') {
                signalEl.textContent = '📈';
                signalEl.className = 'signal-indicator signal-buy';
                signalTextEl.textContent = 'Strong Buy Signal';
            } else {
                signalEl.textContent = '📉';
                signalEl.className = 'signal-indicator signal-sell';
                signalTextEl.textContent = 'Strong Sell Signal';
            }
            
            // Update chart
            if (priceChart) {
                priceChart.data.labels.push(new Date().toLocaleTimeString());
                priceChart.data.datasets[0].data.push(priceData.current.price);
                
                // Keep only last 20 points
                if (priceChart.data.labels.length > 20) {
                    priceChart.data.labels.shift();
                    priceChart.data.datasets[0].data.shift();
                }
                
                priceChart.update();
            }
        }

        // Execute trade
        async function executeTrade(direction) {
            const amount = parseFloat(document.getElementById('tradeAmount').value);
            if (!amount || amount < 100 || amount > 1000) {
                alert('Please enter an amount between $100 and $1000');
                return;
            }

            if (amount > userData.balance) {
                alert('Insufficient balance');
                return;
            }

            // Disable trade buttons
            document.getElementById('buyBtn').disabled = true;
            document.getElementById('sellBtn').disabled = true;

            // Show trade progress with details
            document.getElementById('tradeProgress').style.display = 'block';
            document.getElementById('tradeDirection').textContent = direction;
            document.getElementById('tradeDirection').className = 'trade-direction ' + direction.toLowerCase();
            document.getElementById('tradeAmountDisplay').textContent = '$' + amount;
            
            try {
                const response = await fetch('/api/trade', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount, direction, userId })
                });
                
                const result = await response.json();
                currentTrade = result.trade;
                
                // Display entry price
                document.getElementById('entryPrice').textContent = '$' + currentTrade.entryPrice.toLocaleString();
                
                // Add trade entry marker to chart
                addTradeMarker(currentTrade.entryPrice, 'entry', Date.now());
                
                // Start 20-second countdown with enhanced progress
                startTradeCountdown(currentTrade);
                
            } catch (error) {
                console.error('Trade error:', error);
                alert('Trade failed. Please try again.');
                resetTrade();
            }
        }

        // Start trade countdown with enhanced demo profit logic
        function startTradeCountdown(trade) {
            let timeLeft = 20;
            const timerEl = document.getElementById('timer');
            const livePnlEl = document.getElementById('livePnl');
            const livePercentEl = document.getElementById('livePercent');
            const currentPriceEl = document.getElementById('currentPrice');
            
            // Demo mode: Generate profitable price movement
            const basePrice = trade.entryPrice;
            const targetProfitPercent = 0.5 + Math.random() * 2; // 0.5% to 2.5% profit
            const targetPrice = trade.direction === 'BUY' ? 
                basePrice * (1 + targetProfitPercent / 100) : 
                basePrice * (1 - targetProfitPercent / 100);
            
            const interval = setInterval(async () => {
                timerEl.textContent = timeLeft;
                
                // Demo mode: Calculate favorable current price
                const progress = (20 - timeLeft) / 20; // 0 to 1
                let currentPrice;
                
                if (progress < 0.3) {
                    // First 30%: Slight unfavorable movement to create tension
                    const tensionFactor = trade.direction === 'BUY' ? -0.002 : 0.002;
                    currentPrice = basePrice * (1 + tensionFactor * progress * 3);
                } else {
                    // Last 70%: Gradual movement towards profit
                    const profitProgress = (progress - 0.3) / 0.7;
                    const smoothProgress = 0.5 * (1 + Math.sin((profitProgress - 0.5) * Math.PI));
                    currentPrice = basePrice + (targetPrice - basePrice) * smoothProgress;
                }
                
                // Add small random fluctuations for realism
                currentPrice *= (1 + (Math.random() - 0.5) * 0.001);
                
                // Update current price display
                currentPriceEl.textContent = '$' + currentPrice.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
                
                // Calculate P&L
                let currentPnl = 0;
                let percentChange = 0;
                
                if (trade.direction === 'BUY') {
                    percentChange = ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100;
                    currentPnl = ((currentPrice - trade.entryPrice) / trade.entryPrice) * trade.amount;
                } else {
                    percentChange = ((trade.entryPrice - currentPrice) / trade.entryPrice) * 100;
                    currentPnl = ((trade.entryPrice - currentPrice) / trade.entryPrice) * trade.amount;
                }
                
                // Update P&L displays
                livePnlEl.textContent = (currentPnl >= 0 ? '+' : '') + '$' + currentPnl.toFixed(2);
                livePnlEl.className = 'live-pnl ' + (currentPnl >= 0 ? 'profit' : 'loss');
                
                livePercentEl.textContent = (percentChange >= 0 ? '+' : '') + percentChange.toFixed(2) + '%';
                livePercentEl.className = 'live-percent ' + (percentChange >= 0 ? 'profit' : 'loss');
                
                timeLeft--;
                
                if (timeLeft < 0) {
                    clearInterval(interval);
                    // Ensure final result is profitable in demo mode
                    const finalPnl = Math.abs(currentPnl) > 0 ? Math.abs(currentPnl) : trade.amount * 0.015;
                    finalizeTrade(trade, finalPnl, currentPrice);
                }
            }, 1000);
        }

        // Finalize trade with enhanced result display
        function finalizeTrade(trade, finalPnl, finalPrice) {
            // Add trade exit marker to chart
            addTradeMarker(finalPrice, 'exit', Date.now());
            
            // Hide progress, show result
            document.getElementById('tradeProgress').style.display = 'none';
            document.getElementById('tradeResult').style.display = 'block';
            
            const resultIconEl = document.getElementById('resultIcon');
            const resultTextEl = document.getElementById('resultText');
            const finalPnlEl = document.getElementById('finalPnl');
            const finalBalanceEl = document.getElementById('finalBalance');
            const profitPercentEl = document.getElementById('profitPercent');
            
            // Calculate percentage
            const percentChange = trade.direction === 'BUY' ? 
                ((finalPrice - trade.entryPrice) / trade.entryPrice) * 100 :
                ((trade.entryPrice - finalPrice) / trade.entryPrice) * 100;
            
            // In demo mode, always show win (profit guaranteed)
            if (finalPnl >= 0) {
                resultIconEl.textContent = '🎉';
                resultIconEl.className = 'result-icon win-icon';
                resultTextEl.textContent = 'Congratulations! You won!';
                userData.stats.wins++;
            } else {
                resultIconEl.textContent = '😔';
                resultIconEl.className = 'result-icon lose-icon';
                resultTextEl.textContent = 'Better luck next time!';
            }
            
            // Create trade record
            const tradeRecord = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                direction: trade.direction,
                amount: trade.amount,
                entryPrice: trade.entryPrice,
                exitPrice: finalPrice,
                profit: finalPnl,
                percentage: percentChange
            };
            
            // Update user balance and display
            const newBalance = userData.balance + finalPnl;
            
            finalPnlEl.textContent = (finalPnl >= 0 ? '+' : '') + '$' + finalPnl.toFixed(2);
            finalPnlEl.className = 'live-pnl ' + (finalPnl >= 0 ? 'profit' : 'loss');
            
            if (profitPercentEl) {
                profitPercentEl.textContent = (percentChange >= 0 ? '+' : '') + percentChange.toFixed(2) + '%';
                profitPercentEl.className = 'live-percent ' + (percentChange >= 0 ? 'profit' : 'loss');
            }
            
            if (finalBalanceEl) {
                finalBalanceEl.textContent = '$' + newBalance.toFixed(2);
            }
            
            // Update user data
            userData.balance = newBalance;
            userData.stats.total++;
            userData.stats.profit += finalPnl;
            userData.trades.push(tradeRecord);
            
            // Save to server if authenticated
            saveUserData();
            
            // Update balance display
            document.getElementById('balance').textContent = '$' + userData.balance.toFixed(2);
            
            updateStats();
            
            // Auto-hide result after 5 seconds
            setTimeout(() => {
                resetTrade();
            }, 5000);
        }

        // Reset trade
        function resetTrade() {
            document.getElementById('tradeProgress').style.display = 'none';
            document.getElementById('tradeResult').style.display = 'none';
            document.getElementById('buyBtn').disabled = false;
            document.getElementById('sellBtn').disabled = false;
            currentTrade = null;
        }

        // Update statistics
        function updateStats() {
            document.getElementById('balance').textContent = '$' + userData.balance.toLocaleString();
            document.getElementById('totalTrades').textContent = userData.stats.total;
            document.getElementById('winRate').textContent = userData.stats.total > 0 ? 
                Math.round((userData.stats.wins / userData.stats.total) * 100) + '%' : '0%';
            document.getElementById('totalProfit').textContent = '$' + userData.stats.profit.toFixed(2);
        }

        // Deposit/Withdraw functions
        function showDeposit() {
            const amount = prompt('Enter deposit amount:', '1000');
            if (amount && !isNaN(amount) && amount > 0) {
                userData.balance += parseFloat(amount);
                updateStats();
                alert('Deposited $' + amount + ' successfully!');
            }
        }

        function showWithdraw() {
            const amount = prompt('Enter withdrawal amount:', '500');
            if (amount && !isNaN(amount) && amount > 0) {
                if (amount <= userData.balance) {
                    userData.balance -= parseFloat(amount);
                    updateStats();
                    alert('Withdrew $' + amount + ' successfully!');
                } else {
                    alert('Insufficient balance');
                }
            }
        }

        // Initialize app
        async function init() {
            // Initialize Telegram authentication first
            initTelegramAuth();
            
            await initCharts();
            updateStats();
            updatePriceDisplay();
            
            // Update price every 5 seconds
            setInterval(updatePriceDisplay, 5000);
        }

        // Start the app
        init();
    </script>
</body>
</html>`;
}


