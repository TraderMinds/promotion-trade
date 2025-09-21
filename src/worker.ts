export interface Env {
  TRADING_KV: KVNamespace;
  BASE_URL: string;
  MINIAPP_URL: string;
  TELEGRAM_BOT_TOKEN: string;
  BOT_TOKEN_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Set CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Serve miniapp
    if (url.pathname === '/miniapp' || url.pathname === '/miniapp/') {
      return serveMiniApp(url, env);
    }

    // API Routes
    if (url.pathname.startsWith('/api/')) {
      let response;
      
      if (url.pathname === '/api/prices') {
        response = handlePrices();
      } else if (url.pathname.startsWith('/api/user/register')) {
        response = await handleUserRegister(request, env);
      } else if (url.pathname.startsWith('/api/user/')) {
        const userId = url.pathname.split('/')[3];
        response = await handleGetUser(userId, env);
      } else {
        response = new Response('Not Found', { status: 404 });
      }
      
      // Add CORS headers to all API responses
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      return response;
    }

    // Handle Telegram webhook
    if (url.pathname === '/webhook' && request.method === 'POST') {
      return handleTelegramWebhook(request, env);
    }

    return new Response('Not Found', { status: 404 });
  },
};

function handlePrices(): Response {
  const cryptoPrices = [
    { symbol: 'BTC', name: 'Bitcoin', price: 45000, change: 2.5 },
    { symbol: 'ETH', name: 'Ethereum', price: 3200, change: -1.2 },
    { symbol: 'BNB', name: 'Binance Coin', price: 320, change: 0.8 },
    { symbol: 'ADA', name: 'Cardano', price: 0.45, change: 3.2 },
    { symbol: 'SOL', name: 'Solana', price: 98, change: -2.1 },
    { symbol: 'DOT', name: 'Polkadot', price: 6.2, change: 1.5 },
    { symbol: 'AVAX', name: 'Avalanche', price: 24, change: -0.5 },
    { symbol: 'LINK', name: 'Chainlink', price: 14.5, change: 2.8 }
  ];
  
  return new Response(JSON.stringify(cryptoPrices), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleTelegramWebhook(request: Request, env: Env): Promise<Response> {
  try {
    const update = await request.json() as any;
    console.log('📨 Received Telegram update:', JSON.stringify(update));
    
    // Handle text messages
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const userId = update.message.from.id;
      const text = update.message.text;
      const firstName = update.message.from.first_name || 'User';
      
      console.log(`📝 Message from ${firstName} (${userId}): ${text}`);
      
      if (text === '/start') {
        // Register or get user data
        const userData = await getUserData(userId, env);
        
        if (!userData) {
          // Register new user
          const newUserData = {
            id: userId,
            firstName: firstName,
            lastName: update.message.from.last_name || '',
            username: update.message.from.username || null,
            languageCode: update.message.from.language_code || 'en',
            balance: 10.00,
            registered: true,
            createdAt: new Date().toISOString(),
            positions: [],
            tradeHistory: [],
            transactions: [],
            totalTrades: 0,
            winRate: 0
          };
          
          await saveUserData(userId, newUserData, env);
          
          await sendTelegramMessage(chatId, 
            `🎉 Welcome to TradeX Pro, ${firstName}!\n\n` +
            `You've received a $10.00 welcome bonus!\n\n` +
            `🚀 Start trading cryptocurrencies with our AI-powered bot.\n\n` +
            `Click the button below to open the trading app:`,
            {
              reply_markup: {
                inline_keyboard: [[
                  {
                    text: "🚀 Open TradeX Pro",
                    web_app: { url: `${env.MINIAPP_URL}?user_id=${userId}&from_bot=1` }
                  }
                ]]
              }
            },
            env
          );
        } else {
          // Existing user
          await sendTelegramMessage(chatId,
            `👋 Welcome back, ${firstName}!\n\n` +
            `💰 Your balance: $${userData.balance.toFixed(2)}\n` +
            `📊 Total trades: ${userData.totalTrades || 0}\n` +
            `🎯 Win rate: ${userData.winRate || 0}%\n\n` +
            `Ready to continue trading?`,
            {
              reply_markup: {
                inline_keyboard: [[
                  {
                    text: "🚀 Open TradeX Pro",
                    web_app: { url: `${env.MINIAPP_URL}?user_id=${userId}&from_bot=1` }
                  }
                ]]
              }
            },
            env
          );
        }
      } else if (text === '/balance') {
        const userData = await getUserData(userId, env);
        if (userData) {
          await sendTelegramMessage(chatId,
            `💰 Your TradeX Pro Balance\n\n` +
            `Balance: $${userData.balance.toFixed(2)}\n` +
            `Total Trades: ${userData.totalTrades || 0}\n` +
            `Win Rate: ${userData.winRate || 0}%\n\n` +
            `Want to trade more?`,
            {
              reply_markup: {
                inline_keyboard: [[
                  {
                    text: "🚀 Open TradeX Pro",
                    web_app: { url: `${env.MINIAPP_URL}?user_id=${userId}&from_bot=1` }
                  }
                ]]
              }
            },
            env
          );
        } else {
          await sendTelegramMessage(chatId, "❌ User not found. Please send /start first.", {}, env);
        }
      } else if (text === '/help') {
        await sendTelegramMessage(chatId,
          `🤖 TradeX Pro Help\n\n` +
          `Commands:\n` +
          `/start - Start using the bot\n` +
          `/balance - Check your balance\n` +
          `/help - Show this help message\n\n` +
          `🚀 Use the web app for full trading functionality!`,
          {
            reply_markup: {
              inline_keyboard: [[
                {
                  text: "🚀 Open TradeX Pro",
                  web_app: { url: `${env.MINIAPP_URL}?user_id=${userId}&from_bot=1` }
                }
              ]]
            }
          },
          env
        );
      } else {
        // Unknown command
        await sendTelegramMessage(chatId,
          `🤔 I don't understand that command.\n\n` +
          `Try:\n` +
          `/start - Get started\n` +
          `/balance - Check balance\n` +
          `/help - Get help\n\n` +
          `Or use the web app for trading:`,
          {
            reply_markup: {
              inline_keyboard: [[
                {
                  text: "🚀 Open TradeX Pro",
                  web_app: { url: `${env.MINIAPP_URL}?user_id=${userId}&from_bot=1` }
                }
              ]]
            }
          },
          env
        );
      }
    }
    
    return new Response('OK');
  } catch (error) {
    console.error('❌ Error handling Telegram webhook:', error);
    return new Response('Error', { status: 500 });
  }
}

async function sendTelegramMessage(chatId: number, text: string, options: any = {}, env: Env): Promise<void> {
  try {
    const BOT_TOKEN = env.BOT_TOKEN_SECRET || env.TELEGRAM_BOT_TOKEN;
    if (!BOT_TOKEN) {
      console.error('❌ Bot token not found in environment variables');
      return;
    }
    
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      ...options
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Telegram API error:', errorText);
    } else {
      console.log('✅ Message sent successfully');
    }
  } catch (error) {
    console.error('❌ Error sending Telegram message:', error);
  }
}

async function handleUserRegister(request: Request, env: Env): Promise<Response> {
  try {
    const userData: any = await request.json();
    console.log('Registering user:', userData);
    
    // Save user data to KV
    await saveUserData(userData.id, userData, env);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'User registered successfully',
      id: userData.id,
      firstName: userData.firstName,
      balance: userData.balance
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Registration failed' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleGetUser(userId: string, env: Env): Promise<Response> {
  try {
    const userData = await getUserData(parseInt(userId), env);
    
    if (userData) {
      return new Response(JSON.stringify(userData), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Error getting user data:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function getUserData(userId: number, env: Env): Promise<any> {
  try {
    const userData = await env.TRADING_KV.get(`user:${userId}`);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
}

async function saveUserData(userId: number, userData: any, env: Env): Promise<void> {
  try {
    await env.TRADING_KV.put(`user:${userId}`, JSON.stringify(userData));
  } catch (error) {
    console.error('Error saving user data:', error);
  }
}

function serveMiniApp(url: URL, env: Env): Response {
  if (url.pathname === '/miniapp' || url.pathname === '/miniapp/') {
    return new Response(MINIAPP_HTML(env), { 
      headers: { 
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': "default-src 'self' https:; script-src 'self' 'unsafe-inline' https://telegram.org https://cdn.jsdelivr.net; connect-src 'self' https: wss:; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:"
      } 
    });
  }
  return new Response('Not Found', { status: 404 });
}

function MINIAPP_HTML(env: Env) {
  const baseUrl = env.BASE_URL || 'https://promotion-trade-bot.tradermindai.workers.dev';
  console.log('Server-side baseUrl:', baseUrl);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TradeX Pro - AI Trading Bot</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: rgb(102, 126, 234);
            min-height: 100vh;
            color: rgb(51, 51, 51);
        }
        
        .container {
            max-width: 400px;
            margin: 0 auto;
            background: white;
            min-height: 100vh;
            position: relative;
            overflow-x: hidden;
        }
        
        .header {
            background: rgb(102, 126, 234);
            color: white;
            padding: 20px;
            text-align: center;
            position: relative;
        }
        
        .header h1 {
            font-size: 24px;
            margin-bottom: 5px;
        }
        
        .header .subtitle {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .user-info {
            background: rgba(255, 255, 255, 0.1);
            margin: 15px 0 0 0;
            padding: 15px;
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }
        
        .balance-section {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 10px;
        }
        
        .balance {
            font-size: 20px;
            font-weight: bold;
        }
        
        .nav-tabs {
            display: flex;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
            position: sticky;
            top: 0;
            z-index: 100;
        }
        
        .nav-tab {
            flex: 1;
            padding: 15px 10px;
            text-align: center;
            background: none;
            border: none;
            font-size: 14px;
            color: #6c757d;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: 500;
        }
        
        .nav-tab.active {
            color: #667eea;
            background: white;
            border-bottom: 2px solid #667eea;
        }
        
        .nav-tab:hover {
            background: #e9ecef;
        }
        
        .tab-content {
            display: none;
            padding: 20px;
            min-height: calc(100vh - 200px);
        }
        
        .tab-content.active {
            display: block;
        }
        
        .crypto-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .crypto-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
            border: 1px solid #e9ecef;
        }
        
        .crypto-item:hover {
            background: #e9ecef;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .crypto-info {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        
        .crypto-name {
            font-weight: 600;
            font-size: 16px;
        }
        
        .crypto-price {
            font-size: 14px;
            color: #6c757d;
        }
        
        .crypto-change {
            font-weight: bold;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 14px;
        }
        
        .crypto-change.positive {
            color: #28a745;
            background: #d4edda;
        }
        
        .crypto-change.negative {
            color: #dc3545;
            background: #f8d7da;
        }
        
        .trade-section {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        
        .trade-buttons {
            display: flex;
            gap: 10px;
        }
        
        .trade-btn {
            flex: 1;
            padding: 15px;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .buy-btn {
            background: #28a745;
            color: white;
        }
        
        .buy-btn:hover {
            background: #218838;
        }
        
        .sell-btn {
            background: #dc3545;
            color: white;
        }
        
        .sell-btn:hover {
            background: #c82333;
        }
        
        .wallet-section {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        
        .wallet-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            border: 1px solid #e9ecef;
        }
        
        .wallet-balance {
            font-size: 24px;
            font-weight: bold;
            color: #28a745;
            text-align: center;
            margin-bottom: 20px;
        }
        
        .wallet-actions {
            display: flex;
            gap: 10px;
        }
        
        .wallet-btn {
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .deposit-btn {
            background: #28a745;
            color: white;
        }
        
        .withdraw-btn {
            background: #6c757d;
            color: white;
        }
        
        .portfolio-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 10px;
            margin-bottom: 10px;
            border: 1px solid #e9ecef;
        }
        
        .portfolio-info h4 {
            margin: 0;
            font-size: 16px;
        }
        
        .portfolio-info p {
            margin: 5px 0 0 0;
            color: #6c757d;
            font-size: 14px;
        }
        
        .portfolio-value {
            text-align: right;
        }
        
        .portfolio-value .amount {
            font-weight: bold;
            font-size: 16px;
        }
        
        .portfolio-value .change {
            font-size: 14px;
            margin-top: 5px;
        }
        
        .loading {
            text-align: center;
            padding: 50px 20px;
            color: rgb(108, 117, 125);
        }
        
        .ai-signals {
            background: rgb(102, 126, 234);
            color: white;
            padding: 20px;
            border-radius: 15px;
            margin-bottom: 20px;
            position: relative;
            overflow: hidden;
        }
        
        @keyframes slide {
            0% { transform: translateX(-20px); }
            100% { transform: translateX(0); }
        }
        
        .ai-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 15px;
            position: relative;
            z-index: 1;
        }
        
        .ai-robot {
            font-size: 24px;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
        
        .ai-title {
            font-size: 18px;
            font-weight: bold;
        }
        
        .ai-signal {
            background: rgba(255, 255, 255, 0.15);
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
            backdrop-filter: blur(10px);
        }
        
        .signal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .signal-crypto {
            font-weight: bold;
            font-size: 16px;
        }
        
        .signal-action {
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 14px;
        }
        
        .signal-buy {
            background: #28a745;
            color: white;
        }
        
        .signal-sell {
            background: #dc3545;
            color: white;
        }
        
        .signal-reason {
            font-size: 14px;
            opacity: 0.9;
            margin-bottom: 10px;
        }
        
        .signal-buttons {
            display: flex;
            gap: 10px;
        }
        
        .signal-btn {
            flex: 1;
            padding: 10px;
            border: none;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .follow-btn {
            background: rgba(255, 255, 255, 0.9);
            color: #333;
        }
        
        .ignore-btn {
            background: rgba(255, 255, 255, 0.3);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.5);
        }
        
        .signal-btn:hover {
            transform: translateY(-2px);
        }
        
        .hidden {
            display: none;
        }
    </style>
</head>
<body>
    <script>
        console.log('✅ SCRIPT STARTED');
        
        // Base URL for API calls  
        var API_BASE = '${baseUrl}';
        console.log('🌐 API_BASE set to:', API_BASE);
        
        // Debug function to show what's happening
        function showDebug(message) {
            console.log('🔧 DEBUG:', message);
            var userEl = document.getElementById('userType');
            if (userEl) {
                userEl.textContent = '🔧 ' + message;
                userEl.style.color = '#FFA500';
            }
        }
        
        // Extract real user data from Telegram WebApp
        function getUserFromTelegram() {
            try {
                var urlParams = new URLSearchParams(window.location.search);
                var userId = urlParams.get('user_id');
                var fromBot = urlParams.get('from_bot') === '1';
                
                var telegramUser = null;
                if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
                    telegramUser = window.Telegram.WebApp.initDataUnsafe.user;
                }
                
                console.log('🔍 User detection:', {
                    userId: userId,
                    fromBot: fromBot,
                    telegramUser: telegramUser
                });
                
                if (telegramUser || userId) {
                    return {
                        id: telegramUser ? telegramUser.id : userId,
                        firstName: telegramUser ? telegramUser.first_name : (userId === '8403188272' ? 'Tayden' : 'User'),
                        lastName: telegramUser ? telegramUser.last_name : '',
                        username: telegramUser ? telegramUser.username : null,
                        languageCode: telegramUser ? telegramUser.language_code : 'en',
                        fromBot: fromBot
                    };
                }
                
                return null;
            } catch (e) {
                console.error('❌ Error extracting user data:', e);
                showDebug('Error extracting user: ' + e.message);
                return null;
            }
        }
        
        // Load user data from backend
        function loadUserData(userId) {
            console.log('👤 Loading user data for ID:', userId);
            showDebug('Loading user data...');
            return fetch(API_BASE + '/api/user/' + userId)
                .then(function(response) {
                    if (response.ok) {
                        return response.json();
                    } else {
                        console.log('ℹ️ User not found, needs registration');
                        return null;
                    }
                })
                .then(function(userData) {
                    console.log('✅ User data loaded:', userData);
                    return userData;
                })
                .catch(function(e) {
                    console.error('❌ Error loading user data:', e);
                    showDebug('Error loading user: ' + e.message);
                    return null;
                });
        }
        
        // Register new user
        function registerUser(telegramUser) {
            console.log('📝 Registering new user:', telegramUser);
            showDebug('Registering user...');
            var userData = {
                id: telegramUser.id,
                firstName: telegramUser.firstName,
                lastName: telegramUser.lastName,
                username: telegramUser.username,
                languageCode: telegramUser.languageCode,
                balance: 10.00,
                registered: true,
                createdAt: new Date().toISOString()
            };
            
            return fetch(API_BASE + '/api/user/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            })
            .then(function(response) {
                if (response.ok) {
                    return response.json();
                } else {
                    throw new Error('Registration failed');
                }
            })
            .then(function(result) {
                console.log('✅ User registered successfully:', result);
                return result;
            })
            .catch(function(e) {
                console.error('❌ Error registering user:', e);
                showDebug('Error registering: ' + e.message);
                return null;
            });
        }
        
        // Global functions for UI
        window.showTab = function(tabName) {
            console.log('🔄 Tab clicked:', tabName);
            showDebug('Switching to ' + tabName + ' tab');
            
            // Hide all tabs
            var tabs = ['trade', 'portfolio', 'wallet', 'history'];
            for (var i = 0; i < tabs.length; i++) {
                var tabEl = document.getElementById(tabs[i] + '-tab');
                if (tabEl) {
                    tabEl.classList.remove('active');
                }
            }
            
            // Remove active from nav tabs
            var navTabs = document.querySelectorAll('.nav-tab');
            for (var i = 0; i < navTabs.length; i++) {
                navTabs[i].classList.remove('active');
            }
            
            // Show selected tab
            var selectedTab = document.getElementById(tabName + '-tab');
            if (selectedTab) {
                selectedTab.classList.add('active');
            }
            
            // Activate corresponding nav button
            for (var i = 0; i < navTabs.length; i++) {
                var btn = navTabs[i];
                if (btn.onclick && btn.onclick.toString().includes("'" + tabName + "'")) {
                    btn.classList.add('active');
                    break;
                }
            }
            
            showDebug('Tab switched to: ' + tabName);
        };
        
        window.selectCrypto = function(symbol) {
            console.log('🎯 Selected crypto:', symbol);
            alert('Selected ' + symbol + '! Trading functionality coming soon.');
        };
        
        window.showDeposit = function() {
            var amount = prompt('Enter deposit amount:');
            if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
                alert('Deposit functionality coming soon! Amount: $' + parseFloat(amount).toFixed(2));
            }
        };
        
        window.showWithdraw = function() {
            var amount = prompt('Enter withdrawal amount:');
            if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
                alert('Withdrawal functionality coming soon! Amount: $' + parseFloat(amount).toFixed(2));
            }
        };
        
        window.executeTrade = function(type) {
            alert(type.toUpperCase() + ' functionality coming soon!');
        };
        
        // AI Signal functions
        var aiSignals = [];
        var currentPrices = {};
        
        function generateAISignal() {
            var cryptos = ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'DOT', 'AVAX', 'LINK'];
            var crypto = cryptos[Math.floor(Math.random() * cryptos.length)];
            var action = Math.random() > 0.5 ? 'BUY' : 'SELL';
            
            var reasons = {
                BUY: [
                    'Strong bullish momentum detected',
                    'Technical indicators show oversold conditions',
                    'Breaking above key resistance level',
                    'Volume spike indicates institutional buying',
                    'AI pattern recognition shows 87% success rate'
                ],
                SELL: [
                    'Bearish divergence spotted on RSI',
                    'Approaching strong resistance zone',
                    'Profit-taking opportunity at current levels',
                    'Market sentiment turning negative',
                    'Technical analysis suggests correction incoming'
                ]
            };
            
            return {
                id: Date.now(),
                crypto: crypto,
                action: action,
                reason: reasons[action][Math.floor(Math.random() * reasons[action].length)],
                timestamp: new Date(),
                price: currentPrices[crypto] || 0
            };
        }
        
        function displayAISignal(signal) {
            var aiContainer = document.getElementById('ai-signals');
            if (!aiContainer) return;
            
            var signalHtml = '<div class="ai-signal" id="signal-' + signal.id + '">';
            signalHtml += '<div class="signal-header">';
            signalHtml += '<span class="signal-crypto">' + signal.crypto + '</span>';
            signalHtml += '<span class="signal-action signal-' + signal.action.toLowerCase() + '">' + signal.action + '</span>';
            signalHtml += '</div>';
            signalHtml += '<div class="signal-reason">📊 ' + signal.reason + '</div>';
            signalHtml += '<div class="signal-buttons">';
            signalHtml += '<button class="signal-btn follow-btn" onclick="followSignal(\'' + signal.id + '\', \'' + signal.action + '\', \'' + signal.crypto + '\')">✅ Follow Signal</button>';
            signalHtml += '<button class="signal-btn ignore-btn" onclick="ignoreSignal(\'' + signal.id + '\', \'' + signal.action + '\', \'' + signal.crypto + '\')">❌ Ignore</button>';
            signalHtml += '</div>';
            signalHtml += '</div>';
            
            aiContainer.innerHTML = signalHtml;
        }
        
        window.followSignal = function(signalId, action, crypto) {
            console.log('Following signal:', signalId, action, crypto);
            
            // Simulate trading result after 3 seconds
            var signalEl = document.getElementById('signal-' + signalId);
            if (signalEl) {
                signalEl.innerHTML = '<div style="text-align: center; padding: 20px;">' +
                    '<div style="font-size: 18px; margin-bottom: 10px;">⏳ Executing ' + action + ' for ' + crypto + '...</div>' +
                    '<div>AI is analyzing market conditions...</div>' +
                '</div>';
            }
            
            setTimeout(function() {
                // Generate profit (10-20%)
                var profit = 10 + Math.random() * 10;
                var isProfit = true;
                
                if (signalEl) {
                    signalEl.innerHTML = '<div style="text-align: center; padding: 20px; background: rgba(40, 167, 69, 0.2); border-radius: 10px;">' +
                        '<div style="font-size: 20px; margin-bottom: 10px;">🎉 SUCCESS!</div>' +
                        '<div style="font-size: 16px; font-weight: bold; color: #28a745;">+' + profit.toFixed(1) + '% Profit</div>' +
                        '<div style="margin-top: 10px;">AI signal was correct! Great job following the recommendation.</div>' +
                    '</div>';
                }
                
                // Update balance (simulate)
                var balanceEl = document.getElementById('balance');
                var walletBalanceEl = document.getElementById('wallet-balance');
                if (balanceEl) {
                    var currentBalance = parseFloat(balanceEl.textContent.replace('$', ''));
                    var newBalance = currentBalance + (currentBalance * profit / 100);
                    balanceEl.textContent = '$' + newBalance.toFixed(2);
                    if (walletBalanceEl) {
                        walletBalanceEl.textContent = '$' + newBalance.toFixed(2);
                    }
                }
                
                // Generate new signal after 5 seconds
                setTimeout(function() {
                    var newSignal = generateAISignal();
                    displayAISignal(newSignal);
                }, 5000);
                
            }, 3000);
        };
        
        window.ignoreSignal = function(signalId, action, crypto) {
            console.log('Ignoring signal:', signalId, action, crypto);
            
            var signalEl = document.getElementById('signal-' + signalId);
            if (signalEl) {
                signalEl.innerHTML = '<div style="text-align: center; padding: 20px;">' +
                    '<div style="font-size: 16px; margin-bottom: 10px;">⏭️ Signal Ignored</div>' +
                    '<div>Waiting for new AI analysis...</div>' +
                '</div>';
            }
            
            setTimeout(function() {
                // Simulate what would have happened (15-25% loss since they ignored good advice)
                var loss = 15 + Math.random() * 10;
                
                if (signalEl) {
                    signalEl.innerHTML = '<div style="text-align: center; padding: 20px; background: rgba(220, 53, 69, 0.2); border-radius: 10px;">' +
                        '<div style="font-size: 20px; margin-bottom: 10px;">😱 MISSED OPPORTUNITY!</div>' +
                        '<div style="font-size: 16px; font-weight: bold; color: #dc3545;">-' + loss.toFixed(1) + '% Potential Loss</div>' +
                        '<div style="margin-top: 10px;">You could have avoided this loss by following the AI signal!</div>' +
                    '</div>';
                }
                
                // Generate new signal after 5 seconds
                setTimeout(function() {
                    var newSignal = generateAISignal();
                    displayAISignal(newSignal);
                }, 5000);
                
            }, 3000);
        };
        
        // Initialize app when DOM is ready
        function initializeApp() {
            console.log('🔧 Starting main initialization...');
            showDebug('Initializing app...');
            
            var telegramUser = getUserFromTelegram();
            console.log('👤 Telegram user:', telegramUser);
            
            var userEl = document.getElementById('userType');
            var balanceEl = document.getElementById('balance');
            
            if (telegramUser && telegramUser.id) {
                showDebug('Found user: ' + telegramUser.firstName);
                
                loadUserData(telegramUser.id).then(function(userData) {
                    if (userData) {
                        console.log('✅ Existing user found');
                        if (userEl) {
                            userEl.textContent = '👋 Welcome back, ' + userData.firstName + '!';
                            userEl.style.color = '#4CAF50';
                        }
                        if (balanceEl) {
                            balanceEl.textContent = '$' + (userData.balance || 10.00).toFixed(2);
                        }
                        var walletBalanceEl = document.getElementById('wallet-balance');
                        if (walletBalanceEl) {
                            walletBalanceEl.textContent = '$' + (userData.balance || 10.00).toFixed(2);
                        }
                    } else {
                        console.log('🆕 New user, registering...');
                        if (userEl) {
                            userEl.textContent = '📝 Registering ' + telegramUser.firstName + '...';
                            userEl.style.color = '#FFA500';
                        }
                        
                        registerUser(telegramUser).then(function(registeredUser) {
                            if (registeredUser) {
                                if (userEl) {
                                    userEl.textContent = '🎉 Welcome ' + registeredUser.firstName + '! $10 bonus added!';
                                    userEl.style.color = '#4CAF50';
                                }
                                if (balanceEl) {
                                    balanceEl.textContent = '$' + (registeredUser.balance || 10.00).toFixed(2);
                                }
                                var walletBalanceEl = document.getElementById('wallet-balance');
                                if (walletBalanceEl) {
                                    walletBalanceEl.textContent = '$' + (registeredUser.balance || 10.00).toFixed(2);
                                }
                            } else {
                                if (userEl) {
                                    userEl.textContent = '❌ Registration failed - Demo Mode';
                                    userEl.style.color = '#f44336';
                                }
                            }
                        });
                    }
                });
            } else {
                console.log('⚠️ No user data available, using demo mode');
                showDebug('Demo mode - no user data');
                if (userEl) {
                    userEl.textContent = '👤 Demo Mode (No Telegram data)';
                    userEl.style.color = '#888';
                }
            }
            
            // Load cryptocurrency prices
            console.log('💰 Loading cryptocurrency prices...');
            showDebug('Loading prices...');
            fetch(API_BASE + '/api/prices')
                .then(function(response) { 
                    console.log('📥 Prices response:', response.status);
                    return response.json(); 
                })
                .then(function(data) {
                    console.log('✅ Prices loaded:', data.length, 'items');
                    showDebug('Prices loaded: ' + data.length + ' cryptocurrencies');
                    
                    var cryptoList = document.getElementById('crypto-list');
                    if (cryptoList) {
                        var html = '';
                        for (var i = 0; i < data.length; i++) {
                            var crypto = data[i];
                            var changeClass = crypto.change >= 0 ? 'positive' : 'negative';
                            var changeSymbol = crypto.change >= 0 ? '+' : '';
                            html += '<div class="crypto-item" onclick="selectCrypto(\'' + crypto.symbol + '\')">';
                            html += '<div class="crypto-info">';
                            html += '<div class="crypto-name">' + crypto.name + ' (' + crypto.symbol + ')</div>';
                            html += '<div class="crypto-price">$' + crypto.price.toLocaleString() + '</div>';
                            html += '</div>';
                            html += '<div class="crypto-change ' + changeClass + '">' + changeSymbol + crypto.change + '%</div>';
                            html += '</div>';
                        }
                        cryptoList.innerHTML = html;
                        console.log('✅ Prices displayed successfully');
                        
                        // Store current prices for AI signals
                        for (var i = 0; i < data.length; i++) {
                            currentPrices[data[i].symbol] = data[i].price;
                        }
                        
                        // Generate first AI signal after 2 seconds
                        setTimeout(function() {
                            var firstSignal = generateAISignal();
                            displayAISignal(firstSignal);
                        }, 2000);
                        
                        // Update user display to show success
                        setTimeout(function() {
                            if (userEl && userEl.textContent.includes('🔧')) {
                                if (telegramUser && telegramUser.firstName) {
                                    userEl.textContent = '👋 Welcome ' + telegramUser.firstName + '!';
                                    userEl.style.color = '#4CAF50';
                                } else {
                                    userEl.textContent = '👤 Demo Mode';
                                    userEl.style.color = '#888';
                                }
                            }
                        }, 1000);
                    }
                })
                .catch(function(error) {
                    console.error('❌ Error loading prices:', error);
                    showDebug('Error loading prices: ' + error.message);
                });
        }
        
        // Wait for DOM to load then initialize
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeApp);
        } else {
            // DOM already loaded
            setTimeout(initializeApp, 100);
        }
        
        console.log('✅ SCRIPT FULLY LOADED');
    </script>

    <div class="container">
        <div class="header">
            <h1>🚀 TradeX Pro</h1>
            <p class="subtitle">AI-Powered Trading Bot</p>
            <div class="user-info">
                <div id="userType">Loading...</div>
                <div class="balance-section">
                    <span>Balance:</span>
                    <span class="balance" id="balance">$10.00</span>
                </div>
            </div>
        </div>
        
        <div class="nav-tabs">
            <button class="nav-tab active" onclick="showTab('trade')">💹 Trade</button>
            <button class="nav-tab" onclick="showTab('portfolio')">📊 Portfolio</button>
            <button class="nav-tab" onclick="showTab('wallet')">💳 Wallet</button>
            <button class="nav-tab" onclick="showTab('history')">📈 History</button>
        </div>
        
        <div id="trade-tab" class="tab-content active">
            <div class="trade-section">
                <div class="ai-signals" id="ai-signals">
                    <div class="ai-header">
                        <span class="ai-robot">🤖</span>
                        <span class="ai-title">AI Trading Signals</span>
                    </div>
                    <div style="text-align: center; padding: 20px;">
                        <div>🔮 AI is analyzing market conditions...</div>
                        <div style="margin-top: 10px; font-size: 14px; opacity: 0.8;">Generating smart trading signals for you</div>
                    </div>
                </div>
                
                <h3>🔥 Hot Cryptocurrencies</h3>
                <div id="crypto-list" class="crypto-list">
                    <div class="loading">Loading cryptocurrency prices...</div>
                </div>
                
                <div class="trade-buttons">
                    <button class="trade-btn buy-btn" onclick="executeTrade('buy')">🔥 BUY</button>
                    <button class="trade-btn sell-btn" onclick="executeTrade('sell')">💰 SELL</button>
                </div>
            </div>
        </div>
        
        <div id="portfolio-tab" class="tab-content">
            <div class="portfolio-section">
                <h3>📊 Your Portfolio</h3>
                <div class="portfolio-item">
                    <div class="portfolio-info">
                        <h4>Bitcoin (BTC)</h4>
                        <p>0.00045 BTC</p>
                    </div>
                    <div class="portfolio-value">
                        <div class="amount">$20.25</div>
                        <div class="change positive">+2.5%</div>
                    </div>
                </div>
                <div class="portfolio-item">
                    <div class="portfolio-info">
                        <h4>Ethereum (ETH)</h4>
                        <p>0.015 ETH</p>
                    </div>
                    <div class="portfolio-value">
                        <div class="amount">$48.00</div>
                        <div class="change negative">-1.2%</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div id="wallet-tab" class="tab-content">
            <div class="wallet-section">
                <h3>💳 Your Wallet</h3>
                <div class="wallet-card">
                    <div class="wallet-balance" id="wallet-balance">$10.00</div>
                    <div class="wallet-actions">
                        <button class="wallet-btn deposit-btn" onclick="showDeposit()">💰 Deposit</button>
                        <button class="wallet-btn withdraw-btn" onclick="showWithdraw()">💸 Withdraw</button>
                    </div>
                </div>
            </div>
        </div>
        
        <div id="history-tab" class="tab-content">
            <div class="history-section">
                <h3>📈 Trading History</h3>
                <p style="text-align: center; color: #6c757d; padding: 50px;">No trades yet. Start trading to see your history!</p>
            </div>
        </div>
    </div>
</body>
</html>`;
}