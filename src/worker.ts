/// <reference types="@cloudflare/workers-types" />
import { getUserState, appendTrade, saveUserState } from './logic/storage.js';
import { runTrade, simulateTicks, mockAISignal, getRealPrice, runRealTrade } from './logic/pricing.js';

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
            min-height: 100vh;
            overflow-x: hidden;
        }
        
        .container {
            max-width: 100vw;
            padding: 10px;
            position: relative;
        }
        
        .header {
            text-align: center;
            padding: 15px 0;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            margin-bottom: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .balance-card {
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 20px;
            margin-bottom: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            text-align: center;
        }
        
        .balance-amount {
            font-size: 2.5rem;
            font-weight: bold;
            margin: 10px 0;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .wallet-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 15px;
        }
        
        .wallet-btn {
            padding: 12px 20px;
            border: none;
            border-radius: 12px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 14px;
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
            border-radius: 20px;
            padding: 20px;
            margin-bottom: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            height: 300px;
        }
        
        .price-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .price-card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 15px;
            text-align: center;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .price-value {
            font-size: 1.5rem;
            font-weight: bold;
            margin: 5px 0;
        }
        
        .price-label {
            font-size: 0.8rem;
            opacity: 0.8;
        }
        
        .ai-signal {
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 20px;
            margin-bottom: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            text-align: center;
        }
        
        .signal-indicator {
            font-size: 3rem;
            margin: 10px 0;
        }
        
        .signal-buy {
            color: #4CAF50;
        }
        
        .signal-sell {
            color: #f44336;
        }
        
        .trading-controls {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .trade-btn {
            padding: 20px;
            border: none;
            border-radius: 20px;
            font-size: 1.1rem;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .buy-btn {
            background: linear-gradient(45deg, #4CAF50, #45a049);
            color: white;
            box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
        }
        
        .sell-btn {
            background: linear-gradient(45deg, #f44336, #da190b);
            color: white;
            box-shadow: 0 4px 15px rgba(244, 67, 54, 0.4);
        }
        
        .trade-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
        }
        
        .trade-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        .amount-input {
            width: 100%;
            padding: 15px;
            border: none;
            border-radius: 15px;
            background: rgba(255, 255, 255, 0.1);
            color: white;
            font-size: 1rem;
            margin-bottom: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .amount-input::placeholder {
            color: rgba(255, 255, 255, 0.6);
        }
        
        .trade-progress {
            display: none;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 30px;
            text-align: center;
            margin-bottom: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .progress-timer {
            font-size: 3rem;
            font-weight: bold;
            margin: 20px 0;
            color: #FFD700;
        }
        
        .live-pnl {
            font-size: 2rem;
            font-weight: bold;
            margin: 15px 0;
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
            border-radius: 20px;
            padding: 30px;
            text-align: center;
            margin-bottom: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .result-icon {
            font-size: 4rem;
            margin: 20px 0;
        }
        
        .win-icon {
            color: #4CAF50;
        }
        
        .lose-icon {
            color: #f44336;
        }
        
        .footer {
            text-align: center;
            padding: 20px;
            opacity: 0.8;
            font-size: 0.9rem;
        }
        
        .pulse {
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255,255,255,.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 1s ease-in-out infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .statistics {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 20px;
            margin-bottom: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
            text-align: center;
        }
        
        .stat-item {
            padding: 10px;
        }
        
        .stat-value {
            font-size: 1.5rem;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .stat-label {
            font-size: 0.8rem;
            opacity: 0.8;
        }
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
            <div>Trade in Progress</div>
            <div class="progress-timer" id="timer">20</div>
            <div>Live P&L</div>
            <div class="live-pnl" id="livePnl">$0.00</div>
            <canvas id="liveChart" style="max-height: 200px;"></canvas>
        </div>
        
        <div class="trade-result" id="tradeResult">
            <div class="result-icon" id="resultIcon">🎉</div>
            <div id="resultText">Congratulations!</div>
            <div class="live-pnl" id="finalPnl">+$25.50</div>
            <button class="trade-btn buy-btn" onclick="resetTrade()" style="margin-top: 20px; width: 100%;">
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
        if (tg) {
            tg.ready();
        }

        let userId = tg?.initDataUnsafe?.user?.id || 12345;
        let currentTrade = null;
        let priceChart = null;
        let liveChart = null;
        let userData = { balance: 10000, trades: [], stats: { total: 0, wins: 0, profit: 0 } };

        // Initialize charts
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
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
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

            // Show trade progress
            document.getElementById('tradeProgress').style.display = 'block';
            
            try {
                const response = await fetch('/api/trade', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount, direction, userId })
                });
                
                const result = await response.json();
                currentTrade = result.trade;
                
                // Start 20-second countdown
                startTradeCountdown(currentTrade);
                
            } catch (error) {
                console.error('Trade error:', error);
                alert('Trade failed. Please try again.');
                resetTrade();
            }
        }

        // Start trade countdown
        function startTradeCountdown(trade) {
            let timeLeft = 20;
            const timerEl = document.getElementById('timer');
            const livePnlEl = document.getElementById('livePnl');
            
            const interval = setInterval(async () => {
                timerEl.textContent = timeLeft;
                
                // Update live P&L
                const currentPrice = await fetchRealPrice();
                let currentPnl = 0;
                
                if (trade.direction === 'BUY') {
                    currentPnl = ((currentPrice.current.price - trade.entryPrice) / trade.entryPrice) * trade.amount;
                } else {
                    currentPnl = ((trade.entryPrice - currentPrice.current.price) / trade.entryPrice) * trade.amount;
                }
                
                livePnlEl.textContent = (currentPnl >= 0 ? '+' : '') + '$' + currentPnl.toFixed(2);
                livePnlEl.className = 'live-pnl ' + (currentPnl >= 0 ? 'profit' : 'loss');
                
                timeLeft--;
                
                if (timeLeft < 0) {
                    clearInterval(interval);
                    finalizeTrade(trade, currentPnl);
                }
            }, 1000);
        }

        // Finalize trade
        function finalizeTrade(trade, finalPnl) {
            // Hide progress, show result
            document.getElementById('tradeProgress').style.display = 'none';
            document.getElementById('tradeResult').style.display = 'block';
            
            const resultIconEl = document.getElementById('resultIcon');
            const resultTextEl = document.getElementById('resultText');
            const finalPnlEl = document.getElementById('finalPnl');
            
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
            
            finalPnlEl.textContent = (finalPnl >= 0 ? '+' : '') + '$' + finalPnl.toFixed(2);
            finalPnlEl.className = 'live-pnl ' + (finalPnl >= 0 ? 'profit' : 'loss');
            
            // Update user data
            userData.balance += finalPnl;
            userData.stats.total++;
            userData.stats.profit += finalPnl;
            
            updateStats();
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


