/// <reference types="@cloudflare/workers-types" />
import { getUserState, appendTrade, saveUserState } from './logic/storage.js';
import { runTrade, simulateTicks, mockAISignal } from './logic/pricing.js';
import { priceStreamer } from './logic/streaming.js';

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
    const priceData = priceStreamer.getLatestPrice();
    return json(priceData);
  }

  if (url.pathname === '/api/price-stream') {
    const stream = priceStreamer.generatePriceStream();
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    });
  }

  if (url.pathname === '/api/trade' && req.method === 'POST') {
    const body = await req.json().catch(() => ({})) as { amount?: number };
    const amount = Number(body.amount ?? 0) || 0;
    if (amount <= 0) return json({ error: 'invalid amount' }, 400);
    const state = await getUserState(env, userId);
    if (amount > state.balance) return json({ error: 'insufficient balance' }, 400);
    const seed = (Date.now() / 1000 | 0) + userId;
    const result = runTrade(seed, amount);
    const trade = {
      id: crypto.randomUUID(),
      ts: Date.now(),
      amount,
      direction: result.direction,
      entryPrice: result.entryPrice,
      exitPrice: result.exitPrice,
      profit: result.profit
    };
    const newState = await appendTrade(env, userId, trade);
    return json({ trade, state: newState, ticks: result.ticks });
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
    return new Response(MINIAPP_JS(env), { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
  }
  return new Response('Not found', { status: 404 });
}

function MINIAPP_HTML(env: Env) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
<title>Promotion Trade Demo</title>
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
body{font-family:system-ui,Arial;margin:0;background:#0f1115;color:#f5f7fa;padding:12px}
header{display:flex;align-items:center;gap:8px}
.card{background:#1b1f27;padding:12px;border-radius:8px;margin-bottom:12px;box-shadow:0 2px 4px rgba(0,0,0,.4)}
button{background:#2563eb;color:#fff;border:none;padding:10px 16px;border-radius:6px;cursor:pointer;font-size:14px}
button:disabled{opacity:.5;cursor:not-allowed}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px}
.sig-buy{color:#10b981;font-weight:600}
.sig-sell{color:#ef4444;font-weight:600}
pre{white-space:pre-wrap;font-size:12px;max-height:160px;overflow:auto;background:#11151c;padding:8px;border-radius:6px}
</style>
</head><body>
<header><h2>Promotion Trade Demo</h2></header>
<div class="card" id="status">Loading...</div>
<div class="card">
  <div id="price">Price: ...</div>
  <div>Signal: <span id="signal">...</span></div>
</div>
<div class="card">
  <label>Deposit Amount: <input id="depositAmount" type="number" value="1000" style="width:100px"/></label>
  <button id="depositBtn">Deposit</button>
</div>
<div class="card">
  <label>Trade Amount: <input id="tradeAmount" type="number" value="500" style="width:100px"/></label>
  <button id="tradeBtn">Run 20s AI Trade</button>
</div>
<div class="card">
  <h4>Last Trade</h4>
  <div id="lastTrade">None</div>
  <pre id="ticks"></pre>
</div>
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<script src="/miniapp/app.js"></script>
</body></html>`;
}

function MINIAPP_JS(env: Env) {
  return `const tg = window.Telegram?.WebApp;\nlet userId = 12345; // For demo, static. In real app you'd securely map telegram user.\nconst base = '';\n
async function fetchState(){
  const r = await fetch(\`/api/state?user=\${userId}\`); return r.json();
}
async function fetchPrice(){
  const r = await fetch(\`/api/price?user=\${userId}\`); return r.json();
}
async function deposit(amount){
  const r = await fetch(\`/api/deposit?user=\${userId}\`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount})}); return r.json();
}
async function trade(amount){
  const r = await fetch(\`/api/trade?user=\${userId}\`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount})}); return r.json();
}

function fmt(n){return Number(n).toFixed(2)}

async function refreshAll(){
  const st = await fetchState();
  document.getElementById('status').innerHTML = 'Balance: $'+fmt(st.balance)+' | Trades: '+st.trades.length;
  const p = await fetchPrice();
  document.getElementById('price').textContent = 'Price: '+fmt(p.current.price)+' XUA/USD';
  const sigEl = document.getElementById('signal');
  sigEl.textContent = p.signal;
  sigEl.className = p.signal === 'BUY' ? 'sig-buy':'sig-sell';
}

setInterval(refreshAll, 4000);
refreshAll();

document.getElementById('depositBtn').onclick = async () => {
  const amt = Number((document.getElementById('depositAmount')).value)||0; if(!amt) return;
  const res = await deposit(amt); await refreshAll(); alert('Deposited: '+fmt(amt));
};

document.getElementById('tradeBtn').onclick = async () => {
  const amt = Number((document.getElementById('tradeAmount')).value)||0; if(!amt) return;
  const res = await trade(amt);
  if(res.error){ alert(res.error); return; }
  const t = res.trade;
  document.getElementById('lastTrade').innerHTML = 
    'Direction: '+t.direction+'<br/>Entry: '+fmt(t.entryPrice)+' Exit: '+fmt(t.exitPrice)+'<br/>Profit: '+fmt(t.profit)+' ($)';
  document.getElementById('ticks').textContent = res.ticks.map(x=>x.t+': '+x.price).join('\n');
  await refreshAll();
};`;
}
