/// <reference types="@cloudflare/workers-types" />

interface Env {
  TELEGRAM_BOT_TOKEN: string;
  TRADING_KV: KVNamespace;
  BASE_URL: string;
  MINIAPP_URL: string;
}

interface TelegramUpdate {
  message?: {
    message_id: number;
    from: { id: number; first_name: string; username?: string };
    chat: { id: number };
    text?: string;
  };
  callback_query?: {
    id: string;
    from: { id: number; first_name: string; username?: string };
    message: { message_id: number; chat: { id: number } };
    data: string;
  };
}

const LANGUAGES = {
  en: {
    name: 'English',
    flag: '🇺🇸',
    welcome_select_language: '🌍 **Welcome to TradeX Pro!**\\n\\nPlease select your preferred language:',
    welcome_register: '🚀 **Welcome to TradeX Pro, {}!**\\n\\n🎁 **Special Gift:** Receive $10 FREE to start trading!\\n\\nClick "Register & Get $10" to claim your bonus!',
    welcome_existing: '🚀 **Welcome back, {}!**\\n\\nYour account is ready for trading!\\n\\n💰 **Balance:** ${:.2f}\\n📊 **Total Trades:** {}\\n🏆 **Win Rate:** {:.1f}%',
    register_success: '🎉 **Registration Successful!**\\n\\n💰 **$10 Gift Added!** Your starting balance is now $10\\n\\nReady to start AI-powered trading?',
    trade_button: '🚀 Open TradeX Pro',
    stats_button: '📊 My Stats',
    deposit_button: '💰 Deposit',
    withdraw_button: '💸 Withdraw',
    history_button: '📜 History',
    language_button: '🌍 Language',
    language_selected: '✅ Language set to English!',
    register_button: '🎁 Register & Get $10'
  },
  es: {
    name: 'Español',
    flag: '🇪🇸',
    welcome_select_language: '🌍 **¡Bienvenido a TradeX Pro!**\\n\\nPor favor selecciona tu idioma preferido:',
    welcome_register: '🚀 **¡Bienvenido a TradeX Pro, {}!**\\n\\n🎁 **Regalo Especial:** ¡Recibe $10 GRATIS para empezar a operar!\\n\\n¡Haz clic en "Registrarse y Obtener $10" para reclamar tu bono!',
    welcome_existing: '🚀 **¡Bienvenido de vuelta, {}!**\\n\\n¡Tu cuenta está lista para operar!\\n\\n💰 **Saldo:** ${:.2f}\\n📊 **Operaciones Totales:** {}\\n🏆 **Tasa de Éxito:** {:.1f}%',
    register_success: '🎉 **¡Registro Exitoso!**\\n\\n💰 **¡$10 de Regalo Añadido!** Tu saldo inicial es ahora $10\\n\\n¿Listo para empezar a operar con IA?',
    trade_button: '🚀 Abrir TradeX Pro',
    stats_button: '📊 Mis Estadísticas',
    deposit_button: '💰 Depositar',
    withdraw_button: '💸 Retirar',
    history_button: '📜 Historial',
    language_button: '🌍 Idioma',
    language_selected: '✅ ¡Idioma establecido en Español!',
    register_button: '🎁 Registrarse y Obtener $10'
  },
  fr: {
    name: 'Français',
    flag: '🇫🇷',
    welcome_select_language: '🌍 **Bienvenue sur TradeX Pro !**\\n\\nVeuillez sélectionner votre langue préférée :',
    welcome_register: '🚀 **Bienvenue sur TradeX Pro, {} !**\\n\\n🎁 **Cadeau spécial :** Recevez 10 $ GRATUITS pour commencer à trader !\\n\\nCliquez sur "S\'inscrire et obtenir 10 $" pour réclamer votre bonus !',
    welcome_existing: '🚀 **Bon retour, {} !**\\n\\nVotre compte est prêt pour le trading !\\n\\n💰 **Solde :** {:.2f} $\\n📊 **Total des trades :** {}\\n🏆 **Taux de réussite :** {:.1f}%',
    register_success: '🎉 **Inscription réussie !**\\n\\n💰 **10 $ de cadeau ajoutés !** Votre solde initial est maintenant de 10 $\\n\\nPrêt à commencer le trading IA ?',
    trade_button: '🚀 Ouvrir TradeX Pro',
    stats_button: '📊 Mes Statistiques',
    deposit_button: '💰 Dépôt',
    withdraw_button: '💸 Retrait',
    history_button: '📜 Historique',
    language_button: '🌍 Langue',
    language_selected: '✅ Langue définie en Français !',
    register_button: '🎁 S\'inscrire et obtenir 10 $'
  },
  de: {
    name: 'Deutsch',
    flag: '🇩🇪',
    welcome_select_language: '🌍 **Willkommen bei TradeX Pro!**\\n\\nBitte wählen Sie Ihre bevorzugte Sprache:',
    welcome_register: '🚀 **Willkommen bei TradeX Pro, {} !**\\n\\n🎁 **Spezielles Geschenk:** Erhalten Sie 10 $ KOSTENLOS um mit dem Trading zu beginnen!\\n\\nKlicken Sie auf "Registrieren & 10$ erhalten" um Ihren Bonus zu erhalten!',
    welcome_existing: '🚀 **Willkommen zurück, {} !**\\n\\nIhr Konto ist bereit zum Trading!\\n\\n💰 **Guthaben:** {:.2f} $\\n📊 **Gesamt Trades:** {}\\n🏆 **Erfolgsrate:** {:.1f}%',
    register_success: '🎉 **Registrierung erfolgreich!**\\n\\n💰 **10 $ Geschenk hinzugefügt!** Ihr Startguthaben beträgt jetzt 10 $\\n\\nBereit für AI Trading?',
    trade_button: '🚀 TradeX Pro öffnen',
    stats_button: '📊 Meine Statistiken',
    deposit_button: '💰 Einzahlen',
    withdraw_button: '💸 Auszahlen',
    history_button: '📜 Verlauf',
    language_button: '🌍 Sprache',
    language_selected: '✅ Sprache auf Deutsch eingestellt!',
    register_button: '🎁 Registrieren & 10$ erhalten'
  }
};

function getLanguage(code: string) {
  return LANGUAGES[code as keyof typeof LANGUAGES] || LANGUAGES.en;
}

function getTexts(langCode: string) {
  return getLanguage(langCode);
}

function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

async function handlePriceAPI(env: Env): Promise<Response> {
  try {
    // Cache key for prices
    const cacheKey = 'crypto_prices';
    
    // Try to get cached data first
    const cached = await env.TRADING_KV.get(cacheKey);
    if (cached) {
      const data = JSON.parse(cached);
      // Check if cache is less than 1 minute old
      if (Date.now() - data.timestamp < 60000) {
        return new Response(JSON.stringify(data.prices), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        });
      }
    }
    
    // Fetch fresh data from CoinGecko
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,cardano,solana,polkadot,avalanche-2,chainlink,polygon,uniswap&vs_currencies=usd&include_24hr_change=true'
    );
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    const priceData = await response.json() as any;
    
    // Transform to our format
    const cryptoPrices = [
      { symbol: 'BTC', name: 'Bitcoin', price: priceData.bitcoin?.usd || 0, change: priceData.bitcoin?.usd_24h_change || 0 },
      { symbol: 'ETH', name: 'Ethereum', price: priceData.ethereum?.usd || 0, change: priceData.ethereum?.usd_24h_change || 0 },
      { symbol: 'BNB', name: 'BNB', price: priceData.binancecoin?.usd || 0, change: priceData.binancecoin?.usd_24h_change || 0 },
      { symbol: 'ADA', name: 'Cardano', price: priceData.cardano?.usd || 0, change: priceData.cardano?.usd_24h_change || 0 },
      { symbol: 'SOL', name: 'Solana', price: priceData.solana?.usd || 0, change: priceData.solana?.usd_24h_change || 0 },
      { symbol: 'DOT', name: 'Polkadot', price: priceData.polkadot?.usd || 0, change: priceData.polkadot?.usd_24h_change || 0 },
      { symbol: 'AVAX', name: 'Avalanche', price: priceData['avalanche-2']?.usd || 0, change: priceData['avalanche-2']?.usd_24h_change || 0 },
      { symbol: 'LINK', name: 'Chainlink', price: priceData.chainlink?.usd || 0, change: priceData.chainlink?.usd_24h_change || 0 },
      { symbol: 'MATIC', name: 'Polygon', price: priceData.polygon?.usd || 0, change: priceData.polygon?.usd_24h_change || 0 },
      { symbol: 'UNI', name: 'Uniswap', price: priceData.uniswap?.usd || 0, change: priceData.uniswap?.usd_24h_change || 0 }
    ];
    
    // Cache the result
    const cacheData = {
      prices: cryptoPrices,
      timestamp: Date.now()
    };
    
    await env.TRADING_KV.put(cacheKey, JSON.stringify(cacheData), { expirationTtl: 300 }); // 5 minutes TTL
    
    return new Response(JSON.stringify(cryptoPrices), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  } catch (error) {
    console.error('Price API error:', error);
    
    // Return mock data if API fails
    const mockPrices = [
      { symbol: 'BTC', name: 'Bitcoin', price: 45000, change: 2.5 },
      { symbol: 'ETH', name: 'Ethereum', price: 3200, change: -1.2 },
      { symbol: 'BNB', name: 'BNB', price: 320, change: 0.8 },
      { symbol: 'ADA', name: 'Cardano', price: 0.5, change: 5.2 },
      { symbol: 'SOL', name: 'Solana', price: 120, change: -3.1 }
    ];
    
    return new Response(JSON.stringify(mockPrices), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
}

async function handleWalletAPI(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as any;
    const { action, userId, amount } = body;
    
    if (!userId || !action) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }
    
    // Get current user data
    const userData = await getUserData(parseInt(userId), env) || {};
    
    if (action === 'deposit') {
      if (!amount || amount <= 0) {
        return new Response(JSON.stringify({ error: 'Invalid deposit amount' }), { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        });
      }
      
      userData.balance = (userData.balance || 10) + parseFloat(amount);
      userData.transactions = userData.transactions || [];
      userData.transactions.unshift({
        type: 'deposit',
        amount: parseFloat(amount),
        timestamp: new Date().toISOString(),
        id: Date.now().toString()
      });
      
      await saveUserData(parseInt(userId), userData, env);
      
      return new Response(JSON.stringify({ 
        success: true, 
        balance: userData.balance,
        message: `$${amount} deposited successfully!`
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    } else if (action === 'withdraw') {
      if (!amount || amount <= 0) {
        return new Response(JSON.stringify({ error: 'Invalid withdrawal amount' }), { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        });
      }
      
      if (amount > userData.balance) {
        return new Response(JSON.stringify({ error: 'Insufficient balance' }), { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        });
      }
      
      userData.balance -= parseFloat(amount);
      userData.transactions = userData.transactions || [];
      userData.transactions.unshift({
        type: 'withdrawal',
        amount: parseFloat(amount),
        timestamp: new Date().toISOString(),
        id: Date.now().toString()
      });
      
      await saveUserData(parseInt(userId), userData, env);
      
      return new Response(JSON.stringify({ 
        success: true, 
        balance: userData.balance,
        message: `$${amount} withdrawn successfully!`
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), { 
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }
  } catch (error) {
    console.error('Wallet API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
}

async function handleUserDataAPI(url: URL, env: Env): Promise<Response> {
  try {
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId parameter' }), { 
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }
    
    const userData = await getUserData(parseInt(userId), env);
    
    // Return user data without sensitive information - handle null userData
    const safeUserData = userData || {};
    return new Response(JSON.stringify({
      balance: safeUserData.balance || 10,
      positions: safeUserData.positions || [],
      tradeHistory: safeUserData.tradeHistory || [],
      transactions: safeUserData.transactions || [],
      totalTrades: safeUserData.totalTrades || 0,
      winRate: safeUserData.winRate || 0,
      registered: safeUserData.registered || false
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  } catch (error) {
    console.error('User data API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
}

async function handleTradeAPI(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as any;
    const { userId, type, symbol, amount, price } = body;
    
    if (!userId || !type || !symbol || !amount || !price) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }
    
    const userData = await getUserData(parseInt(userId), env) || {};
    const quantity = amount / price;
    
    // Initialize arrays if they don't exist
    userData.positions = userData.positions || [];
    userData.tradeHistory = userData.tradeHistory || [];
    userData.totalTrades = userData.totalTrades || 0;
    userData.winningTrades = userData.winningTrades || 0;
    
    if (type === 'buy') {
      if (amount > userData.balance) {
        return new Response(JSON.stringify({ error: 'Insufficient balance' }), { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        });
      }
      
      userData.balance -= amount;
      
      // Add to positions
      const existingPos = userData.positions.find((p: any) => p.symbol === symbol);
      if (existingPos) {
        const totalValue = existingPos.quantity * existingPos.avgPrice + amount;
        existingPos.quantity += quantity;
        existingPos.avgPrice = totalValue / existingPos.quantity;
      } else {
        userData.positions.push({
          symbol: symbol,
          quantity: quantity,
          avgPrice: price,
          openTime: new Date().toISOString()
        });
      }
    } else if (type === 'sell') {
      const position = userData.positions.find((p: any) => p.symbol === symbol);
      if (!position || position.quantity < quantity) {
        return new Response(JSON.stringify({ error: 'Insufficient position to sell' }), { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        });
      }
      
      userData.balance += amount;
      
      // Calculate P&L for statistics
      const soldValue = quantity * price;
      const boughtValue = quantity * position.avgPrice;
      const pnl = soldValue - boughtValue;
      const isWinning = pnl > 0;
      
      userData.totalTrades += 1;
      if (isWinning) {
        userData.winningTrades += 1;
      }
      
      position.quantity -= quantity;
      
      if (position.quantity <= 0.0001) {
        userData.positions = userData.positions.filter((p: any) => p.symbol !== symbol);
      }
      
      // Add detailed trade record
      userData.tradeHistory.unshift({
        type: 'sell',
        symbol: symbol,
        quantity: quantity,
        price: price,
        amount: amount,
        pnl: pnl,
        pnlPercent: (pnl / boughtValue) * 100,
        timestamp: new Date().toISOString()
      });
    }
    
    // Add general trade history record
    userData.tradeHistory.unshift({
      type: type,
      symbol: symbol,
      quantity: quantity,
      price: price,
      amount: amount,
      timestamp: new Date().toISOString()
    });
    
    // Calculate win rate
    userData.winRate = userData.totalTrades > 0 ? (userData.winningTrades / userData.totalTrades) * 100 : 0;
    
    await saveUserData(parseInt(userId), userData, env);
    
    return new Response(JSON.stringify({ 
      success: true, 
      balance: userData.balance,
      positions: userData.positions,
      tradeHistory: userData.tradeHistory.slice(0, 20), // Return latest 20 trades
      totalTrades: userData.totalTrades,
      winRate: userData.winRate,
      message: `${type.toUpperCase()} order executed: ${quantity.toFixed(6)} ${symbol} for $${amount.toFixed(2)}`
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  } catch (error) {
    console.error('Trade API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
}

async function sendTelegram(env: Env, method: string, params: any): Promise<any> {
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  
  const result = await response.json() as any;
  if (!result.ok) {
    console.error('Telegram API error:', result);
    throw new Error(`Telegram API error: ${result.description}`);
  }
  
  return result;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400'
        }
      });
    }
    
    // Basic health check
    if (url.pathname === '/') {
      return new Response('Promotion Trade Bot Worker');
    }
    
    // Handle webhook
    if (url.pathname === '/webhook' && request.method === 'POST') {
      return handleTelegram(request, env);
    }
    
    // Serve miniapp
    if (url.pathname.startsWith('/miniapp')) {
      return serveMiniApp(url, env);
    }
    
    // Handle price API
    if (url.pathname === '/api/prices' && request.method === 'GET') {
      return handlePriceAPI(env);
    }
    
    // Handle wallet operations API
    if (url.pathname === '/api/wallet' && request.method === 'POST') {
      return handleWalletAPI(request, env);
    }
    
    // Handle user data API
    if (url.pathname === '/api/user' && request.method === 'GET') {
      return handleUserDataAPI(url, env);
    }
    
    // Handle trade execution API
    if (url.pathname === '/api/trade' && request.method === 'POST') {
      return handleTradeAPI(request, env);
    }
    
    return new Response('Not found', { status: 404 });
  }
};

async function handleTelegram(request: Request, env: Env): Promise<Response> {
  try {
    const update: TelegramUpdate = await request.json();
    
    if (update.message) {
      return handleMessage(update.message, env);
    }
    
    if (update.callback_query) {
      return handleCallbackQuery(update.callback_query, env);
    }
    
    return new Response('ok');
  } catch (error) {
    console.error('Error handling telegram update:', error);
    return new Response('error', { status: 500 });
  }
}

async function handleMessage(message: any, env: Env): Promise<Response> {
  try {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const text = message.text || '';
    const userName = message.from.first_name || 'User';
    
    console.log(`Message from ${userName} (${userId}): ${text}`);
    
    if (text.startsWith('/start')) {
      console.log('Processing /start command');
      
      try {
        // Get or create user data
        let userData = await getUserData(userId, env);
        console.log('User data loaded:', userData ? 'exists' : 'null');

        if (!userData || !userData.registered) {
          // New user - show language selection
          console.log('New user - showing language selection');
          await showLanguageSelection(chatId, env);
          console.log('Language selection sent successfully');
        } else {
          // Existing user - show main menu
          console.log('Existing user - showing main menu');
          await showMainMenu(chatId, userId, userData, env);
          console.log('Main menu sent successfully');
        }
      } catch (error) {
        console.error('Error handling /start command:', error);
        // Send a simple fallback message
        await sendTelegram(env, 'sendMessage', {
          chat_id: chatId,
          text: '🤖 Welcome to TradeX Pro! Please try again.'
        });
      }
      return new Response('ok');
    }
    
    if (text.startsWith('/help')) {
      const helpText = `🤖 **TradeX Pro Bot Help**

🚀 **/start** - Start the bot and access trading
📊 **Trading** - Open the mini app to trade
💰 **Deposit** - Add funds to your account
💸 **Withdraw** - Withdraw your profits
📜 **History** - View your trading history
🌍 **Language** - Change language

💡 **How it works:**
1. Register and get $10 free
2. Use AI-powered signals
3. Trade and grow your balance

📞 **Support:** Contact @support for help`;
      
      await sendTelegram(env, 'sendMessage', {
        chat_id: chatId,
        text: helpText,
        parse_mode: 'Markdown'
      });
      return new Response('ok');
    }
    
    // Default response
    await sendTelegram(env, 'sendMessage', {
      chat_id: chatId,
      text: 'Use /start to begin trading! 🚀'
    });
    
    return new Response('ok');
  } catch (error) {
    console.error('Error in handleMessage:', error);
    // Send error response
    if (message?.chat?.id) {
      await sendTelegram(env, 'sendMessage', {
        chat_id: message.chat.id,
        text: '🤖 Welcome to TradeX Pro! Please try again.'
      });
    }
    return new Response('ok');
  }
}

async function handleCallbackQuery(callbackQuery: any, env: Env): Promise<Response> {
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;
  const userName = callbackQuery.from.first_name || 'User';
  const messageId = callbackQuery.message.message_id;
  
  console.log(`Callback from ${userName} (${userId}): ${data}`);
  
  // Answer callback query to remove loading state
  await sendTelegram(env, 'answerCallbackQuery', {
    callback_query_id: callbackQuery.id
  });
  
  // Handle language selection
  if (data.startsWith('lang_')) {
    const selectedLang = data.replace('lang_', '');
    console.log(`Language selected: ${selectedLang}`);
    await handleLanguageSelection(chatId, userId, selectedLang, userName, messageId, env);
    return new Response('ok');
  }
  
  // Handle registration
  if (data === 'register') {
    console.log(`Registration requested by user ${userId}`);
    await handleRegistration(chatId, userId, userName, messageId, env);
    return new Response('ok');
  }
  
  // Handle other menu actions
  const userData = await getUserData(userId, env);
  const userLang = userData?.language || 'en';
  
  switch (data) {
    case 'language':
      await showLanguageSelection(chatId, env);
      break;
  }
  
  return new Response('ok');
}

async function showLanguageSelection(chatId: number, env: Env): Promise<void> {
  console.log('showLanguageSelection called for chatId:', chatId);
  
  try {
    await sendTelegram(env, 'sendMessage', {
      chat_id: chatId,
      text: '🌍 **Welcome to TradeX Pro!**\\n\\nPlease select your preferred language:',
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🇺🇸 English', callback_data: 'lang_en' },
            { text: '🇪🇸 Español', callback_data: 'lang_es' }
          ],
          [
            { text: '🇫🇷 Français', callback_data: 'lang_fr' },
            { text: '🇩🇪 Deutsch', callback_data: 'lang_de' }
          ]
        ]
      }
    });
    console.log('Language selection message sent');
  } catch (error) {
    console.error('Error in showLanguageSelection:', error);
    // Send a simple fallback message
    await sendTelegram(env, 'sendMessage', {
      chat_id: chatId,
      text: '🌍 Welcome to TradeX Pro! Bot is starting up...'
    });
  }
}

async function handleLanguageSelection(chatId: number, userId: number, langCode: string, userName: string, messageId: number, env: Env): Promise<void> {
  // Save language preference
  const userData = await getUserData(userId, env) || {};
  userData.language = langCode;
  userData.telegramData = { id: userId, first_name: userName };
  
  await saveUserData(userId, userData, env);
  
  const texts = getTexts(langCode);
  
  // Show language confirmation and registration if new user
  if (!userData.registered) {
    const welcomeText = texts.welcome_register.replace('{}', userName);
    
    await sendTelegram(env, 'editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: welcomeText,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: texts.register_button, callback_data: 'register' }
        ]]
      }
    });
  } else {
    await sendTelegram(env, 'sendMessage', {
      chat_id: chatId,
      text: texts.language_selected
    });
    await showMainMenu(chatId, userId, userData, env);
  }
}

async function handleRegistration(chatId: number, userId: number, userName: string, messageId: number, env: Env): Promise<void> {
  const userData = await getUserData(userId, env) || {};
  const userLang = userData.language || 'en';
  const texts = getTexts(userLang);
  
  // Register user with $10 gift
  userData.id = userId;
  userData.registered = true;
  userData.balance = 10;
  userData.transactions = [];
  userData.onboardingCompleted = true;
  userData.userName = userName;
  userData.createdAt = new Date().toISOString();
  
  await saveUserData(userId, userData, env);
  
  await sendTelegram(env, 'editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text: texts.register_success,
    parse_mode: 'Markdown'
  });
  
  // Show main menu
  setTimeout(() => {
    showMainMenu(chatId, userId, userData, env);
  }, 2000);
}

async function showMainMenu(chatId: number, userId: number, userData: any, env: Env): Promise<void> {
  const userLang = userData?.language || 'en';
  const texts = getTexts(userLang);
  const userName = userData?.userName || userData?.telegramData?.first_name || 'User';
  
  // Calculate stats
  const transactions = userData?.transactions || [];
  const totalTrades = transactions.length;
  const wins = transactions.filter((tx: any) => tx.profit > 0).length;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  
  const welcomeText = texts.welcome_existing
    .replace('{}', userName)
    .replace('{:.2f}', (userData?.balance || 0).toFixed(2))
    .replace('{}', totalTrades.toString())
    .replace('{:.1f}', winRate.toFixed(1));
  
  const keyboard = [
    [{ text: texts.trade_button, web_app: { url: `${env.MINIAPP_URL}?lang=${userLang}&user_id=${userId}&from_bot=1` } }],
    [
      { text: texts.stats_button || '📊 Stats', callback_data: 'stats' },
      { text: texts.history_button || '📜 History', callback_data: 'history' }
    ],
    [
      { text: texts.deposit_button || '💰 Deposit', callback_data: 'deposit' },
      { text: texts.withdraw_button || '💸 Withdraw', callback_data: 'withdraw' }
    ],
    [
      { text: texts.language_button || '🌍 Language', callback_data: 'language' }
    ]
  ];
  
  await sendTelegram(env, 'sendMessage', {
    chat_id: chatId,
    text: welcomeText,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  });
}

async function getUserData(userId: number, env: Env): Promise<any> {
  try {
    const data = await env.TRADING_KV.get(`user:${userId}`);
    return data ? JSON.parse(data) : null;
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
  return new Response('Not found', { status: 404 });
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff;
            font-size: 14px;
            line-height: 1.4;
            overflow-x: hidden;
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
        
        .nav-tabs {
            display: flex;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            margin-bottom: 8px;
            overflow: hidden;
        }
        
        .nav-tab {
            flex: 1;
            padding: 8px;
            background: none;
            border: none;
            color: #fff;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 12px;
        }
        
        .nav-tab.active {
            background: rgba(255, 255, 255, 0.2);
        }
        
        .tab-content {
            display: none;
        }
        
        .tab-content.active {
            display: block;
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
        }
        
        .crypto-list {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 8px;
            margin-bottom: 8px;
        }
        
        .crypto-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            cursor: pointer;
            transition: background 0.3s ease;
        }
        
        .crypto-item:last-child {
            border-bottom: none;
        }
        
        .crypto-item:hover {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
        }
        
        .crypto-info {
            display: flex;
            flex-direction: column;
        }
        
        .crypto-symbol {
            font-weight: bold;
            font-size: 14px;
        }
        
        .crypto-name {
            font-size: 12px;
            color: #ccc;
        }
        
        .crypto-price {
            text-align: right;
        }
        
        .price-value {
            font-weight: bold;
            font-size: 14px;
        }
        
        .price-change {
            font-size: 12px;
            margin-top: 2px;
        }
        
        .positive {
            color: #4CAF50;
        }
        
        .negative {
            color: #f44336;
        }
        
        .trading-panel {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 12px;
            margin-bottom: 8px;
        }
        
        .trade-input-group {
            margin-bottom: 12px;
        }
        
        .trade-input-group label {
            display: block;
            margin-bottom: 4px;
            font-size: 12px;
            color: #ccc;
        }
        
        .trade-input {
            width: 100%;
            padding: 8px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
            font-size: 14px;
        }
        
        .trade-buttons {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-top: 12px;
        }
        
        .trade-btn {
            padding: 12px;
            border: none;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 14px;
        }
        
        .buy-btn {
            background: linear-gradient(45deg, #4CAF50, #45a049);
            color: white;
        }
        
        .sell-btn {
            background: linear-gradient(45deg, #f44336, #da190b);
            color: white;
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
            border-radius: 12px;
            padding: 12px;
            margin-bottom: 8px;
            height: 300px;
        }
        
        .positions-list {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 8px;
        }
        
        .position-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .position-item:last-child {
            border-bottom: none;
        }
        
        .trade-history {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 8px;
            max-height: 300px;
            overflow-y: auto;
        }
        
        .history-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            font-size: 12px;
        }
        
        .history-item:last-child {
            border-bottom: none;
        }
        
        .loading {
            text-align: center;
            padding: 20px;
            color: #ccc;
        }
        
        .hidden {
            display: none;
        }
    </style>
</head>
<body>
    <!-- COMPREHENSIVE DEBUG CONSOLE -->
    <div id="debug-console" style="position: fixed; top: 0; left: 0; width: 100%; height: 200px; background: black; color: lime; font-family: monospace; font-size: 10px; overflow-y: scroll; z-index: 99999; border-bottom: 2px solid red; padding: 5px;">
        <div style="color: yellow; font-weight: bold;">🔧 TRADEX DEBUG CONSOLE</div>
        <div id="debug-log"></div>
    </div>

    <!-- Debug Panel - Hidden Now That It Works -->
    <div id="debug-panel" style="display: none;">
    </div>

    <!-- DEBUG LOGGING SCRIPT - RUNS FIRST -->
    <script>
        // Enhanced logging function
        function debugLog(message) {
            var timestamp = new Date().toISOString().split('T')[1].split('.')[0];
            var logMessage = timestamp + ' - ' + message;
            console.log(logMessage);
            
            var debugLogEl = document.getElementById('debug-log');
            if (debugLogEl) {
                debugLogEl.innerHTML += '<div>' + logMessage + '</div>';
                debugLogEl.scrollTop = debugLogEl.scrollHeight;
            }
        }
        
        debugLog('🚀 DEBUG SYSTEM INITIALIZED');
        debugLog('📱 User Agent: ' + navigator.userAgent);
        debugLog('🌐 Location: ' + window.location.href);
        debugLog('🔧 Fetch available: ' + (typeof fetch !== 'undefined'));
        debugLog('📱 Telegram available: ' + (typeof window.Telegram !== 'undefined'));
        
        // Override console.log to also show in debug console
        var originalLog = console.log;
        console.log = function() {
            originalLog.apply(console, arguments);
            debugLog(Array.prototype.slice.call(arguments).join(' '));
        };
        
        debugLog('✅ Enhanced logging system ready');
    </script>

    <!-- Immediate JavaScript Test -->
    <script>
        console.log('🚀 IMMEDIATE SCRIPT TEST - JavaScript is working!');
        // Test debug panel update immediately
        try {
            var testEl = document.getElementById('debug-status');
            if (testEl) {
                testEl.textContent = 'JS WORKING!';
                console.log('✅ Successfully updated debug status');
            } else {
                console.log('❌ Could not find debug-status element');
            }
            
            // Fix user info display
            var userTypeEl = document.getElementById('userType');
            if (userTypeEl) {
                userTypeEl.textContent = '👤 Demo Mode';
                userTypeEl.style.color = '#888';
                console.log('✅ Fixed user info display');
            }
            
            // Add tab functionality
            window.showTab = function(tabName) {
                console.log('🔄 Switching to tab:', tabName);
                
                // Hide all tabs
                var tabs = ['trade', 'portfolio', 'wallet', 'history'];
                for (var i = 0; i < tabs.length; i++) {
                    var tabContent = document.getElementById(tabs[i] + '-tab');
                    var tabButton = document.querySelector('.nav-tab[onclick*="' + tabs[i] + '"]');
                    
                    if (tabContent) {
                        if (tabs[i] === tabName) {
                            tabContent.style.display = 'block';
                            tabContent.classList.add('active');
                        } else {
                            tabContent.style.display = 'none';
                            tabContent.classList.remove('active');
                        }
                    }
                    
                    if (tabButton) {
                        if (tabs[i] === tabName) {
                            tabButton.classList.add('active');
                        } else {
                            tabButton.classList.remove('active');
                        }
                    }
                }
            };
            
            // Add hide debug function
            window.hideDebugPanel = function() {
                var debugPanel = document.getElementById('debug-panel');
                if (debugPanel) {
                    debugPanel.style.display = 'none';
                }
            };
            
            console.log('✅ Added tab functionality');
            
            // Set up DOM ready handler for price loading
            function loadPricesWhenReady() {
                console.log('🔧 DOM ready check...');
                try {
                    var baseUrlEl = document.getElementById('debug-base-url');
                    var fetchEl = document.getElementById('debug-fetch');
                    var statusEl = document.getElementById('debug-status');
                    
                    if (baseUrlEl && fetchEl && statusEl) {
                        console.log('✅ All debug elements found');
                        
                        baseUrlEl.textContent = '${baseUrl}';
                        fetchEl.textContent = typeof fetch !== 'undefined' ? 'available' : 'NOT AVAILABLE';
                        statusEl.textContent = 'loading prices...';
                        
                        // Load prices
                        console.log('🚀 Loading prices...');
                        fetch('${baseUrl}/api/prices')
                            .then(function(response) {
                                console.log('📥 Response received:', response.status);
                                statusEl.textContent = 'response: ' + response.status;
                                return response.json();
                            })
                            .then(function(data) {
                                console.log('✅ Data received:', data);
                                statusEl.textContent = 'displaying prices...';
                                
                                // Display prices
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
                                    statusEl.textContent = 'prices loaded!';
                                    
                                    // Add crypto selection functionality
                                    window.selectCrypto = function(symbol) {
                                        console.log('🎯 Selected crypto:', symbol);
                                        alert('Selected ' + symbol + '! Trading functionality coming soon.');
                                    };
                                    
                                } else {
                                    console.log('❌ crypto-list element not found');
                                    statusEl.textContent = 'ERROR: no crypto-list';
                                }
                            })
                            .catch(function(error) {
                                console.error('❌ Error loading prices:', error);
                                statusEl.textContent = 'ERROR: ' + error.message;
                            });
                    } else {
                        console.log('❌ Some debug elements not found, retrying...');
                        setTimeout(loadPricesWhenReady, 100);
                    }
                } catch (e) {
                    console.error('❌ Error in loadPricesWhenReady:', e);
                }
            }
            
            // Start loading process
            setTimeout(loadPricesWhenReady, 100);
            
        } catch (e) {
            console.error('❌ Error in immediate script:', e);
        }
    </script>

    <div class="container">
        <div class="header">
            <h1>🚀 TradeX Pro</h1>
            <p>AI-Powered Trading Bot</p>
            <div style="font-size: 0.8rem; color: #ccc;" id="userType">Loading...</div>
            
            <!-- VISUAL PROGRESS INDICATOR -->
            <div id="progress-indicator" style="background: rgba(255,255,255,0.1); padding: 10px; margin: 10px 0; border-radius: 5px; font-size: 12px;">
                <div style="color: yellow; font-weight: bold;">🔄 LOADING PROGRESS:</div>
                <div id="step1" style="color: #666;">1. ⏳ DOM Loading...</div>
                <div id="step2" style="color: #666;">2. ⏳ Scripts Initializing...</div>
                <div id="step3" style="color: #666;">3. ⏳ User Info Loading...</div>
                <div id="step4" style="color: #666;">4. ⏳ Prices Loading...</div>
                <div id="step5" style="color: #666;">5. ⏳ UI Activation...</div>
            </div>
        </div>
        
        <div class="nav-tabs">
            <button class="nav-tab active" onclick="showTab('trade')">📈 Trade</button>
            <button class="nav-tab" onclick="showTab('portfolio')">💼 Portfolio</button>
            <button class="nav-tab" onclick="showTab('wallet')">💰 Wallet</button>
            <button class="nav-tab" onclick="showTab('history')">📜 History</button>
        </div>
        
        <!-- Trade Tab -->
        <div id="trade-tab" class="tab-content active">
            <div class="balance-card">
                <div>Your Balance</div>
                <div class="balance-amount" id="balance">$10.00</div>
            </div>
            
            <div class="crypto-list" id="crypto-list">
                <div class="loading" id="loading-indicator">Loading prices...</div>
                <div id="debug-info" style="font-size: 12px; color: #666; padding: 10px; display: none;">
                    <div>🔧 Debug Info:</div>
                    <div id="debug-base-url">BASE_URL: not set</div>
                    <div id="debug-fetch">Fetch: not tested</div>
                    <div id="debug-status">Status: initializing</div>
                </div>
            </div>
            
            <div class="trading-panel" id="trading-panel" style="display: none;">
                <h3 id="selected-crypto">Select a cryptocurrency to trade</h3>
                <div class="chart-container">
                    <canvas id="price-chart"></canvas>
                </div>
                <div class="trade-input-group">
                    <label for="trade-amount">Amount ($)</label>
                    <input type="number" id="trade-amount" class="trade-input" placeholder="Enter amount" min="1" step="0.01">
                </div>
                <div class="trade-buttons">
                    <button class="trade-btn buy-btn" onclick="executeTrade('buy')">🚀 Buy</button>
                    <button class="trade-btn sell-btn" onclick="executeTrade('sell')">📉 Sell</button>
                </div>
            </div>
        </div>
        
        <!-- Portfolio Tab -->
        <div id="portfolio-tab" class="tab-content">
            <div class="balance-card">
                <div>Portfolio Value</div>
                <div class="balance-amount" id="portfolio-value">$10.00</div>
            </div>
            
            <div class="positions-list" id="positions-list">
                <div class="loading">No open positions</div>
            </div>
        </div>
        
        <!-- Wallet Tab -->
        <div id="wallet-tab" class="tab-content">
            <div class="balance-card">
                <div>Your Balance</div>
                <div class="balance-amount" id="wallet-balance">$10.00</div>
                <div class="wallet-actions">
                    <button class="wallet-btn deposit-btn" onclick="showDeposit()">💰 Deposit</button>
                    <button class="wallet-btn withdraw-btn" onclick="showWithdraw()">💸 Withdraw</button>
                </div>
            </div>
        </div>
        
        <!-- History Tab -->
        <div id="history-tab" class="tab-content">
            <div class="trade-history" id="trade-history">
                <div class="loading">No trade history</div>
            </div>
        </div>
    </div>

    <script>
        console.log('🚀 MiniApp JavaScript starting...');
        
        // Global state
        var currentUser = null;
        var cryptoPrices = [];
        var selectedCrypto = null;
        var userBalance = 10.00;
        var userPositions = [];
        var userHistory = [];
        var BASE_URL = '${baseUrl}';
        console.log('DEBUG: BASE_URL = ', BASE_URL);
        
        // Update debug info
        function updateDebugInfo(key, value) {
            console.log('🔧 updateDebugInfo called:', key, '=', value);
            var debugEl = document.getElementById('debug-' + key);
            if (debugEl) {
                debugEl.textContent = value;
                console.log('✅ Updated debug element:', key, '=', value);
            } else {
                console.log('❌ Debug element not found:', 'debug-' + key);
            }
        }
        
        // Hide debug panel
        function hideDebugPanel() {
            var debugPanel = document.getElementById('debug-panel');
            if (debugPanel) {
                debugPanel.style.display = 'none';
            }
        }
        
        // Initialize debug info immediately
        console.log('🔧 Initializing debug info...');
        updateDebugInfo('base-url', BASE_URL);
        updateDebugInfo('fetch', typeof fetch !== 'undefined' ? 'available' : 'NOT AVAILABLE');
        updateDebugInfo('status', 'script loaded');
        
        // Also try after a short delay in case DOM isn't ready
        setTimeout(function() {
            console.log('🔧 Secondary debug info update...');
            updateDebugInfo('base-url', BASE_URL);
            updateDebugInfo('fetch', typeof fetch !== 'undefined' ? 'available' : 'NOT AVAILABLE');
            updateDebugInfo('status', 'dom ready check');
        }, 100);
        
        // Get URL parameters
        var urlParams = new URLSearchParams(window.location.search);
        var userLang = urlParams.get('lang') || 'en';
        var urlUserId = urlParams.get('user_id');
        var fromBot = urlParams.get('from_bot') === '1';
        
        console.log('URL Parameters:', { userLang: userLang, urlUserId: urlUserId, fromBot: fromBot });
        
        // Initialize app
        function initApp() {
            // Set user info
            var debugEl = document.getElementById('userType');
            if (debugEl) {
                if (urlUserId && fromBot) {
                    debugEl.textContent = '✅ Authenticated via Bot (ID: ' + urlUserId + ')';
                    debugEl.style.color = '#4CAF50';
                    currentUser = urlUserId;
                } else if (urlUserId) {
                    debugEl.textContent = '⚠️ External Access (ID: ' + urlUserId + ')';
                    debugEl.style.color = '#FFA500';
                    currentUser = urlUserId;
                } else {
                    debugEl.textContent = '👤 Demo Mode';
                    debugEl.style.color = '#888';
                    currentUser = 'demo';
                }
            }
            
            // Load prices
            console.log('🚀 About to call loadPrices()');
            loadPrices();
            
            // Load user data
            console.log('👤 About to call loadUserData()');
            loadUserData();
            
            console.log('MiniApp initialized successfully');
        }
        
        // Load cryptocurrency prices
        function loadPrices() {
            console.log('🔄 Starting loadPrices...');
            console.log('🌐 BASE_URL:', BASE_URL);
            console.log('📡 Fetching from:', BASE_URL + '/api/prices');
            console.log('🔧 fetch available:', typeof fetch !== 'undefined');
            console.log('🌍 Network state:', navigator.onLine);
            
            updateDebugInfo('status', 'loading prices...');
            
            // Test if fetch is available
            if (typeof fetch === 'undefined') {
                console.error('❌ fetch API not available!');
                updateDebugInfo('status', 'ERROR: fetch not available');
                displayCryptoPrices();
                return;
            }
            
            fetch(BASE_URL + '/api/prices')
                .then(function(response) { 
                    console.log('📥 Response received:', response.status, response.statusText);
                    console.log('📥 Response headers:', response.headers);
                    console.log('📥 Response OK:', response.ok);
                    console.log('📥 Response type:', response.type);
                    updateDebugInfo('status', 'response: ' + response.status);
                    if (!response.ok) {
                        throw new Error('HTTP error! status: ' + response.status);
                    }
                    return response.json(); 
                })
                .then(function(data) {
                    console.log('✅ Data received:', data);
                    console.log('📊 Number of prices:', data.length);
                    updateDebugInfo('status', 'data received: ' + data.length + ' items');
                    cryptoPrices = data;
                    displayCryptoPrices();
                })
                .catch(function(error) {
                    console.error('❌ Error loading prices:', error);
                    console.error('❌ Error details:', error.message);
                    console.error('❌ Error stack:', error.stack);
                    console.error('❌ Error name:', error.name);
                    updateDebugInfo('status', 'ERROR: ' + error.message);
                    displayCryptoPrices(); // Show with empty data
                });
        }
        
        // Display crypto prices
        function displayCryptoPrices() {
            console.log('🎨 displayCryptoPrices called');
            console.log('📊 cryptoPrices:', cryptoPrices);
            console.log('📊 cryptoPrices.length:', cryptoPrices.length);
            
            updateDebugInfo('status', 'displaying prices...');
            
            var listEl = document.getElementById('crypto-list');
            console.log('🎯 crypto-list element:', listEl);
            
            if (!listEl) {
                console.error('❌ crypto-list element not found!');
                updateDebugInfo('status', 'ERROR: crypto-list not found');
                return;
            }
            
            if (cryptoPrices.length === 0) {
                console.log('⚠️ No prices available, showing error message');
                updateDebugInfo('status', 'No prices available');
                listEl.innerHTML = '<div class="loading">Unable to load prices</div>';
                return;
            }
            
            console.log('✅ Rendering prices for', cryptoPrices.length, 'cryptocurrencies');
            updateDebugInfo('status', 'rendering ' + cryptoPrices.length + ' prices');
            
            var html = '';
            for (var i = 0; i < cryptoPrices.length; i++) {
                var crypto = cryptoPrices[i];
                var changeClass = crypto.change >= 0 ? 'positive' : 'negative';
                var changeSign = crypto.change >= 0 ? '+' : '';
                
                html += '<div class="crypto-item" onclick="selectCrypto(\'' + crypto.symbol + '\')">';
                html += '  <div class="crypto-info">';
                html += '    <div class="crypto-symbol">' + crypto.symbol + '</div>';
                html += '    <div class="crypto-name">' + crypto.name + '</div>';
                html += '  </div>';
                html += '  <div class="crypto-price">';
                html += '    <div class="price-value">$' + crypto.price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 6}) + '</div>';
                html += '    <div class="price-change ' + changeClass + '">';
                html += '      ' + changeSign + crypto.change.toFixed(2) + '%';
                html += '    </div>';
                html += '  </div>';
                html += '</div>';
            }
            
            console.log('🖼️ Setting innerHTML with', html.length, 'characters');
            listEl.innerHTML = html;
            console.log('✅ Prices displayed successfully');
            updateDebugInfo('status', 'SUCCESS: ' + cryptoPrices.length + ' prices displayed');
            
            // Hide debug panel after successful load
            var debugPanel = document.getElementById('debug-info');
            if (debugPanel && cryptoPrices.length > 0) {
                setTimeout(function() {
                    debugPanel.style.display = 'none';
                }, 3000);
            }
        }
        
        // Select crypto for trading
        function selectCrypto(symbol) {
            selectedCrypto = null;
            for (var i = 0; i < cryptoPrices.length; i++) {
                if (cryptoPrices[i].symbol === symbol) {
                    selectedCrypto = cryptoPrices[i];
                    break;
                }
            }
            
            if (!selectedCrypto) return;
            
            document.getElementById('selected-crypto').textContent = 'Trading ' + selectedCrypto.symbol + ' - $' + selectedCrypto.price.toLocaleString();
            document.getElementById('trading-panel').style.display = 'block';
            
            // Create simple price chart
            createPriceChart();
        }
        
        // Create price chart
        function createPriceChart() {
            var ctx = document.getElementById('price-chart');
            if (!ctx || !selectedCrypto) return;
            
            // Generate mock price data for demo
            var labels = [];
            var data = [];
            var basePrice = selectedCrypto.price;
            
            for (var i = 23; i >= 0; i--) {
                labels.push(i + 'h');
                // Generate random price around current price
                var variation = (Math.random() - 0.5) * 0.1; // ±5% variation
                data.push(basePrice * (1 + variation));
            }
            
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: selectedCrypto.symbol + ' Price',
                        data: data,
                        borderColor: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: false,
                            ticks: { color: '#fff' }
                        },
                        x: {
                            ticks: { color: '#fff' }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: { color: '#fff' }
                        }
                    }
                }
            });
        }
        
        // Execute trade
        function executeTrade(type) {
            var amount = parseFloat(document.getElementById('trade-amount').value);
            if (!amount || amount <= 0 || !selectedCrypto) {
                alert('Please enter a valid amount and select a cryptocurrency');
                return;
            }
            
            if (type === 'buy' && amount > userBalance) {
                alert('Insufficient balance');
                return;
            }
            
            if (!currentUser || currentUser === 'demo') {
                // Demo mode - use local state
                executeDemoTrade(type, amount);
                return;
            }
            
            // Real mode - call backend API
            fetch(BASE_URL + '/api/trade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser,
                    type: type,
                    symbol: selectedCrypto.symbol,
                    amount: amount,
                    price: selectedCrypto.price
                })
            })
            .then(function(response) { return response.json(); })
            .then(function(data) {
                if (data.success) {
                    userBalance = data.balance;
                    userPositions = data.positions || [];
                    userHistory = data.tradeHistory || [];
                    
                    updateBalanceDisplay();
                    updatePortfolioDisplay();
                    updateHistoryDisplay();
                    
                    // Clear input
                    document.getElementById('trade-amount').value = '';
                    
                    alert(data.message);
                } else {
                    alert('Error: ' + data.error);
                }
            })
            .catch(function(error) {
                console.error('Trade error:', error);
                alert('Error executing trade');
            });
        }
        
        // Demo trade for demo users
        function executeDemoTrade(type, amount) {
            var price = selectedCrypto.price;
            var quantity = amount / price;
            
            if (type === 'buy') {
                userBalance -= amount;
                
                // Add to positions
                var existingPos = null;
                for (var i = 0; i < userPositions.length; i++) {
                    if (userPositions[i].symbol === selectedCrypto.symbol) {
                        existingPos = userPositions[i];
                        break;
                    }
                }
                
                if (existingPos) {
                    var totalValue = existingPos.quantity * existingPos.avgPrice + amount;
                    existingPos.quantity += quantity;
                    existingPos.avgPrice = totalValue / existingPos.quantity;
                } else {
                    userPositions.push({
                        symbol: selectedCrypto.symbol,
                        name: selectedCrypto.name,
                        quantity: quantity,
                        avgPrice: price
                    });
                }
            } else {
                // Sell
                var position = null;
                for (var i = 0; i < userPositions.length; i++) {
                    if (userPositions[i].symbol === selectedCrypto.symbol) {
                        position = userPositions[i];
                        break;
                    }
                }
                
                if (!position || position.quantity < quantity) {
                    alert('Insufficient position to sell');
                    return;
                }
                
                userBalance += amount;
                position.quantity -= quantity;
                
                if (position.quantity <= 0.0001) {
                    userPositions = userPositions.filter(function(p) { return p.symbol !== selectedCrypto.symbol; });
                }
            }
            
            // Add to history
            userHistory.unshift({
                type: type,
                symbol: selectedCrypto.symbol,
                quantity: quantity,
                price: price,
                amount: amount,
                timestamp: new Date().toISOString()
            });
            
            // Update UI
            updateBalanceDisplay();
            updatePortfolioDisplay();
            updateHistoryDisplay();
            
            // Clear input
            document.getElementById('trade-amount').value = '';
            
            alert(type.toUpperCase() + ' order executed: ' + quantity.toFixed(6) + ' ' + selectedCrypto.symbol + ' for $' + amount.toFixed(2));
        }
        
        // Load user data
        function loadUserData() {
            if (!currentUser || currentUser === 'demo') {
                // Use demo data for demo mode
                updateBalanceDisplay();
                updatePortfolioDisplay();
                updateHistoryDisplay();
                return;
            }
            
            // Fetch real user data from backend
            fetch(BASE_URL + '/api/user?userId=' + currentUser)
                .then(function(response) { return response.json(); })
                .then(function(data) {
                    if (data.error) {
                        console.error('User data error:', data.error);
                        return;
                    }
                    
                    userBalance = data.balance || 10;
                    userPositions = data.positions || [];
                    userHistory = data.tradeHistory || [];
                    
                    updateBalanceDisplay();
                    updatePortfolioDisplay();
                    updateHistoryDisplay();
                })
                .catch(function(error) {
                    console.error('Error loading user data:', error);
                    // Fall back to default values
                    updateBalanceDisplay();
                    updatePortfolioDisplay();
                    updateHistoryDisplay();
                });
        }
        
        // Update balance display
        function updateBalanceDisplay() {
            var balanceEls = document.querySelectorAll('#balance, #wallet-balance');
            for (var i = 0; i < balanceEls.length; i++) {
                if (balanceEls[i]) balanceEls[i].textContent = '$' + userBalance.toFixed(2);
            }
        }
        
        // Update portfolio display
        function updatePortfolioDisplay() {
            var portfolioEl = document.getElementById('positions-list');
            var portfolioValueEl = document.getElementById('portfolio-value');
            
            if (!portfolioEl || !portfolioValueEl) return;
            
            if (userPositions.length === 0) {
                portfolioEl.innerHTML = '<div class="loading">No open positions</div>';
                portfolioValueEl.textContent = '$' + userBalance.toFixed(2);
                return;
            }
            
            var totalValue = userBalance;
            var html = '';
            
            for (var i = 0; i < userPositions.length; i++) {
                var pos = userPositions[i];
                var currentPrice = pos.avgPrice;
                
                // Find current price
                for (var j = 0; j < cryptoPrices.length; j++) {
                    if (cryptoPrices[j].symbol === pos.symbol) {
                        currentPrice = cryptoPrices[j].price;
                        break;
                    }
                }
                
                var currentValue = pos.quantity * currentPrice;
                var pnl = currentValue - (pos.quantity * pos.avgPrice);
                var pnlPercent = (pnl / (pos.quantity * pos.avgPrice)) * 100;
                var pnlClass = pnl >= 0 ? 'positive' : 'negative';
                var pnlSign = pnl >= 0 ? '+' : '';
                
                totalValue += currentValue;
                
                html += '<div class="position-item">';
                html += '  <div>';
                html += '    <div style="font-weight: bold;">' + pos.symbol + '</div>';
                html += '    <div style="font-size: 12px; color: #ccc;">' + pos.quantity.toFixed(6) + ' units</div>';
                html += '  </div>';
                html += '  <div style="text-align: right;">';
                html += '    <div style="font-weight: bold;">$' + currentValue.toFixed(2) + '</div>';
                html += '    <div class="' + pnlClass + '" style="font-size: 12px;">';
                html += '      ' + pnlSign + '$' + pnl.toFixed(2) + ' (' + pnlPercent.toFixed(2) + '%)';
                html += '    </div>';
                html += '  </div>';
                html += '</div>';
            }
            
            portfolioEl.innerHTML = html;
            portfolioValueEl.textContent = '$' + totalValue.toFixed(2);
        }
        
        // Update history display
        function updateHistoryDisplay() {
            var historyEl = document.getElementById('trade-history');
            if (!historyEl) return;
            
            if (userHistory.length === 0) {
                historyEl.innerHTML = '<div class="loading">No trade history</div>';
                return;
            }
            
            var html = '';
            for (var i = 0; i < userHistory.length; i++) {
                var trade = userHistory[i];
                var typeColor = trade.type === 'buy' ? '#4CAF50' : '#f44336';
                
                html += '<div class="history-item">';
                html += '  <div>';
                html += '    <div style="font-weight: bold; color: ' + typeColor + ';">';
                html += '      ' + trade.type.toUpperCase() + ' ' + trade.symbol;
                html += '    </div>';
                html += '    <div style="color: #ccc;">';
                html += '      ' + new Date(trade.timestamp).toLocaleString();
                html += '    </div>';
                html += '  </div>';
                html += '  <div style="text-align: right;">';
                html += '    <div>' + trade.quantity.toFixed(6) + ' units</div>';
                html += '    <div>$' + trade.amount.toFixed(2) + '</div>';
                html += '  </div>';
                html += '</div>';
            }
            
            historyEl.innerHTML = html;
        }
        
        // Show tab
        function showTab(tabName) {
            // Hide all tabs
            var tabs = document.querySelectorAll('.tab-content');
            for (var i = 0; i < tabs.length; i++) {
                tabs[i].classList.remove('active');
            }
            var navTabs = document.querySelectorAll('.nav-tab');
            for (var i = 0; i < navTabs.length; i++) {
                navTabs[i].classList.remove('active');
            }
            
            // Show selected tab
            document.getElementById(tabName + '-tab').classList.add('active');
            event.target.classList.add('active');
            
            // Refresh data if needed
            if (tabName === 'portfolio') {
                updatePortfolioDisplay();
            } else if (tabName === 'history') {
                updateHistoryDisplay();
            }
        }
        
        // Wallet functions
        function showDeposit() {
            var amount = prompt('Enter deposit amount:');
            if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
                // Call backend API
                fetch(BASE_URL + '/api/wallet', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'deposit',
                        userId: currentUser,
                        amount: parseFloat(amount)
                    })
                })
                .then(function(response) { return response.json(); })
                .then(function(data) {
                    if (data.success) {
                        userBalance = data.balance;
                        updateBalanceDisplay();
                        alert(data.message);
                    } else {
                        alert('Error: ' + data.error);
                    }
                })
                .catch(function(error) {
                    console.error('Deposit error:', error);
                    alert('Error processing deposit');
                });
            }
        }
        
        function showWithdraw() {
            var amount = prompt('Enter withdrawal amount:');
            if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
                // Call backend API
                fetch(BASE_URL + '/api/wallet', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'withdraw',
                        userId: currentUser,
                        amount: parseFloat(amount)
                    })
                })
                .then(function(response) { return response.json(); })
                .then(function(data) {
                    if (data.success) {
                        userBalance = data.balance;
                        updateBalanceDisplay();
                        alert(data.message);
                    } else {
                        alert('Error: ' + data.error);
                    }
                })
                .catch(function(error) {
                    console.error('Withdrawal error:', error);
                    alert('Error processing withdrawal');
                });
            }
        }
        
        // Auto-refresh prices every 30 seconds
        setInterval(loadPrices, 30000);
        
        // Initialize the app when DOM is ready
        function initializeApp() {
            console.log('🚀 Initializing app...');
            console.log('📱 Telegram WebApp available:', typeof window.Telegram !== 'undefined');
            console.log('🌐 Current location:', window.location.href);
            console.log('🔧 User agent:', navigator.userAgent);
            
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initApp);
            } else {
                initApp();
            }
        }
        
        // Wait for Telegram WebApp to be ready if available
        if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
            console.log('📱 Telegram WebApp detected, waiting for ready...');
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.expand();
            initializeApp();
        } else {
            console.log('🌐 Standard web context, initializing normally...');
            initializeApp();
        }
        
        // Emergency fallback - try to load prices after 2 seconds regardless
        setTimeout(function() {
            console.log('🚨 Emergency fallback check...');
            updateDebugInfo('status', 'fallback check');
            var cryptoList = document.getElementById('crypto-list');
            if (cryptoList && cryptoList.innerHTML.includes('Loading prices...')) {
                console.log('🔧 Still loading, trying emergency price load...');
                updateDebugInfo('status', 'emergency load');
                loadPrices();
            }
        }, 2000);
    </script>
    
    <!-- FINAL WORKING SCRIPT - RUNS LAST -->
    <script>
        console.log('🚀 FINAL SCRIPT EXECUTING...');
        
        function updateStep(stepNum, status, message) {
            var stepEl = document.getElementById('step' + stepNum);
            if (stepEl) {
                var icon = status === 'success' ? '✅' : status === 'error' ? '❌' : '🔄';
                var color = status === 'success' ? '#4CAF50' : status === 'error' ? '#f44336' : '#FFA500';
                stepEl.innerHTML = stepNum + '. ' + icon + ' ' + message;
                stepEl.style.color = color;
            }
            console.log('STEP ' + stepNum + ' [' + status.toUpperCase() + ']: ' + message);
        }
        
        // STEP 1: DOM Check
        console.log('📋 STEP 1: Checking DOM elements...');
        updateStep(1, 'progress', 'Checking DOM elements...');
        
        var userEl = document.getElementById('userType');
        var cryptoList = document.getElementById('crypto-list');
        var debugLog = document.getElementById('debug-log');
        
        console.log('👤 userEl found:', !!userEl);
        console.log('💰 cryptoList found:', !!cryptoList);
        console.log('🔧 debugLog found:', !!debugLog);
        
        if (userEl && cryptoList) {
            updateStep(1, 'success', 'DOM elements found');
        } else {
            updateStep(1, 'error', 'Missing DOM elements');
            console.error('❌ Missing critical DOM elements');
            return;
        }
        
        // STEP 2: Scripts Initialization
        console.log('🔧 STEP 2: Initializing scripts...');
        updateStep(2, 'progress', 'Initializing scripts...');
        
        try {
            // Test fetch availability
            if (typeof fetch === 'undefined') {
                throw new Error('Fetch API not available');
            }
            
            // Test basic JavaScript functions
            var testArray = [1, 2, 3];
            var testResult = testArray.map(function(x) { return x * 2; });
            console.log('🧪 JavaScript test:', testResult);
            
            updateStep(2, 'success', 'Scripts initialized');
        } catch (e) {
            updateStep(2, 'error', 'Script initialization failed: ' + e.message);
            console.error('❌ Script initialization error:', e);
            return;
        }
        
        // STEP 3: Fix User Info
        console.log('👤 STEP 3: Fixing user info...');
        updateStep(3, 'progress', 'Updating user info...');
        
        try {
            userEl.textContent = '👤 Demo Mode';
            userEl.style.color = '#888';
            updateStep(3, 'success', 'User info updated');
            console.log('✅ User info fixed');
        } catch (e) {
            updateStep(3, 'error', 'User info update failed: ' + e.message);
            console.error('❌ User info error:', e);
        }
        
        // STEP 4: Load Prices
        console.log('💰 STEP 4: Loading cryptocurrency prices...');
        updateStep(4, 'progress', 'Fetching prices from API...');
        
        var apiUrl = '${baseUrl}/api/prices';
        console.log('🌐 API URL:', apiUrl);
        
        // Add detailed network debugging
        fetch(apiUrl)
            .then(function(response) {
                console.log('📡 NETWORK RESPONSE:');
                console.log('  Status:', response.status);
                console.log('  StatusText:', response.statusText);
                console.log('  Headers:', response.headers);
                console.log('  OK:', response.ok);
                console.log('  Type:', response.type);
                console.log('  URL:', response.url);
                
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status + ': ' + response.statusText);
                }
                
                updateStep(4, 'progress', 'Response received (' + response.status + '), parsing JSON...');
                return response.json();
            })
            .then(function(data) {
                console.log('📊 API DATA RECEIVED:');
                console.log('  Type:', typeof data);
                console.log('  Length:', data.length);
                console.log('  Data:', data);
                
                updateStep(4, 'progress', 'Data parsed, displaying ' + data.length + ' items...');
                
                // Generate HTML with detailed logging
                var html = '';
                for (var i = 0; i < data.length; i++) {
                    var crypto = data[i];
                    console.log('🪙 Processing crypto ' + (i+1) + ':', crypto.symbol, crypto.name, crypto.price, crypto.change);
                    
                    var changeClass = crypto.change >= 0 ? 'positive' : 'negative';
                    var changeSymbol = crypto.change >= 0 ? '+' : '';
                    html += '<div class="crypto-item" onclick="alert(\'Selected ' + crypto.symbol + '!\')">';
                    html += '<div class="crypto-info">';
                    html += '<div class="crypto-name">' + crypto.name + ' (' + crypto.symbol + ')</div>';
                    html += '<div class="crypto-price">$' + crypto.price.toLocaleString() + '</div>';
                    html += '</div>';
                    html += '<div class="crypto-change ' + changeClass + '">' + changeSymbol + crypto.change + '%</div>';
                    html += '</div>';
                }
                
                console.log('🎨 Generated HTML length:', html.length);
                console.log('🎨 HTML preview:', html.substring(0, 200) + '...');
                
                cryptoList.innerHTML = html;
                updateStep(4, 'success', 'Prices displayed successfully (' + data.length + ' items)');
                console.log('✅ Prices displayed successfully');
                
                // STEP 5: Activate UI
                console.log('🎮 STEP 5: Activating UI interactions...');
                updateStep(5, 'progress', 'Setting up UI interactions...');
                
                // Add tab functionality with detailed logging
                window.showTab = function(tabName) {
                    console.log('🔄 Tab clicked:', tabName);
                    var tabs = ['trade', 'portfolio', 'wallet', 'history'];
                    for (var i = 0; i < tabs.length; i++) {
                        var tabEl = document.getElementById(tabs[i] + '-tab');
                        if (tabEl) {
                            tabEl.style.display = tabs[i] === tabName ? 'block' : 'none';
                            console.log('📑 Tab ' + tabs[i] + ':', tabs[i] === tabName ? 'shown' : 'hidden');
                        }
                    }
                };
                
                updateStep(5, 'success', 'All systems operational!');
                console.log('🎉 INITIALIZATION COMPLETE - ALL SYSTEMS OPERATIONAL!');
                
                // Hide progress indicator after success
                setTimeout(function() {
                    var progressEl = document.getElementById('progress-indicator');
                    if (progressEl) {
                        progressEl.style.display = 'none';
                    }
                }, 3000);
                
            })
            .catch(function(error) {
                console.error('❌ FETCH ERROR:');
                console.error('  Message:', error.message);
                console.error('  Stack:', error.stack);
                console.error('  Name:', error.name);
                
                updateStep(4, 'error', 'API Error: ' + error.message);
                
                // Show fallback content
                cryptoList.innerHTML = '<div style="text-align: center; padding: 20px; color: #f44336;">❌ Failed to load prices: ' + error.message + '</div>';
            });
            
    </script>
</body>
</html>`;
}