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

async function handleUserByIdAPI(userId: string, env: Env): Promise<Response> {
  try {
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
    
    if (!userData || !userData.registered) {
      return new Response(JSON.stringify({ error: 'User not found' }), { 
        status: 404,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    // Return user data without sensitive information
    return new Response(JSON.stringify({
      id: userData.id,
      firstName: userData.firstName,
      lastName: userData.lastName,
      username: userData.username,
      balance: userData.balance || 10,
      registered: userData.registered,
      createdAt: userData.createdAt
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  } catch (error) {
    console.error('User by ID API error:', error);
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

async function handleUserRegistrationAPI(request: Request, env: Env): Promise<Response> {
  try {
    const userData = await request.json() as any;
    const { id, firstName, lastName, username, languageCode } = userData;

    if (!id || !firstName) {
      return new Response(JSON.stringify({ error: 'Missing required fields: id, firstName' }), { 
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    // Check if user already exists
    const existingUser = await getUserData(parseInt(id), env);
    if (existingUser && existingUser.registered) {
      return new Response(JSON.stringify({ error: 'User already registered' }), { 
        status: 409,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    // Create new user data
    const newUserData = {
      id: parseInt(id),
      firstName: firstName,
      lastName: lastName || '',
      username: username || null,
      languageCode: languageCode || 'en',
      balance: 10.00, // Welcome bonus
      registered: true,
      createdAt: new Date().toISOString(),
      positions: [],
      tradeHistory: [],
      transactions: [],
      totalTrades: 0,
      winRate: 0
    };

    // Save user data
    await saveUserData(parseInt(id), newUserData, env);

    // Return created user data
    return new Response(JSON.stringify({
      id: newUserData.id,
      firstName: newUserData.firstName,
      lastName: newUserData.lastName,
      username: newUserData.username,
      balance: newUserData.balance,
      registered: newUserData.registered,
      createdAt: newUserData.createdAt
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  } catch (error) {
    console.error('User registration API error:', error);
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
    
    // Handle user data by ID
    if (url.pathname.startsWith('/api/user/') && request.method === 'GET') {
      const userId = url.pathname.split('/')[3];
      return handleUserByIdAPI(userId, env);
    }
    
    // Handle user registration
    if (url.pathname === '/api/user/register' && request.method === 'POST') {
      return handleUserRegistrationAPI(request, env);
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
    <!-- SIMPLE WORKING SCRIPT -->
    <script>
        console.log('✅ SIMPLE SCRIPT RUNNING');
        
        // Extract real user data from Telegram WebApp
        function getUserFromTelegram() {
            try {
                // Get URL parameters
                var urlParams = new URLSearchParams(window.location.search);
                var userId = urlParams.get('user_id');
                var fromBot = urlParams.get('from_bot') === '1';
                
                // Try to get user data from Telegram WebApp
                var telegramUser = null;
                if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
                    telegramUser = window.Telegram.WebApp.initDataUnsafe.user;
                }
                
                console.log('🔍 User detection:', {
                    userId: userId,
                    fromBot: fromBot,
                    telegramUser: telegramUser
                });
                
                // If we have a user ID (either from Telegram or URL), create user object
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
                return null;
            }
        }
        
        // Load user data from backend
        function loadUserData(userId) {
            console.log('👤 Loading user data for ID:', userId);
            return fetch('${baseUrl}/api/user/' + userId)
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
                    return null;
                });
        }
        
        // Register new user
        function registerUser(telegramUser) {
            console.log('📝 Registering new user:', telegramUser);
            var userData = {
                id: telegramUser.id,
                firstName: telegramUser.firstName,
                lastName: telegramUser.lastName,
                username: telegramUser.username,
                languageCode: telegramUser.languageCode,
                balance: 10.00, // Welcome bonus
                registered: true,
                createdAt: new Date().toISOString()
            };
            
            return fetch('${baseUrl}/api/user/register', {
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
                return null;
            });
        }
        
        setTimeout(function() {
            console.log('🔧 Starting authentication flow...');
            
            // Get user from Telegram
            var telegramUser = getUserFromTelegram();
            console.log('👤 Telegram user:', telegramUser);
            
            var userEl = document.getElementById('userType');
            var balanceEl = document.getElementById('balance');
            
            if (telegramUser && telegramUser.id) {
                // Try to load existing user
                loadUserData(telegramUser.id).then(function(userData) {
                
                if (userData) {
                    // Existing user - show their data
                    console.log('✅ Existing user found');
                    if (userEl) {
                        userEl.textContent = '👋 Welcome back, ' + userData.firstName + '!';
                        userEl.style.color = '#4CAF50';
                    }
                    if (balanceEl) {
                        balanceEl.textContent = '$' + (userData.balance || 10.00).toFixed(2);
                    }
                    // Update wallet tab balance too
                    var walletBalanceEl = document.getElementById('wallet-balance');
                    if (walletBalanceEl) {
                        walletBalanceEl.textContent = '$' + (userData.balance || 10.00).toFixed(2);
                    }
                } else {
                    // New user - register them
                    console.log('🆕 New user, registering...');
                    if (userEl) {
                        userEl.textContent = '� Registering ' + telegramUser.firstName + '...';
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
                            // Update wallet tab balance too
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
                // No user data available - fallback to demo
                console.log('⚠️ No user data available, using demo mode');
                if (userEl) {
                    userEl.textContent = '�👤 Demo Mode (No Telegram data)';
                    userEl.style.color = '#888';
                }
            }
            
            // Load cryptocurrency prices
            console.log('💰 Loading cryptocurrency prices...');
            fetch('${baseUrl}/api/prices')
                .then(function(response) { return response.json(); })
                .then(function(data) {
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
                        console.log('✅ Prices loaded successfully');
                        
                        // Add crypto selection functionality
                        window.selectCrypto = function(symbol) {
                            console.log('🎯 Selected crypto:', symbol);
                            alert('Selected ' + symbol + '! Trading functionality coming soon.');
                        };
                        
                        // Add tab functionality
                        window.showTab = function(tabName) {
                            console.log('🔄 Tab clicked:', tabName);
                            var tabs = ['trade', 'portfolio', 'wallet', 'history'];
                            for (var i = 0; i < tabs.length; i++) {
                                var tabEl = document.getElementById(tabs[i] + '-tab');
                                if (tabEl) {
                                    tabEl.style.display = tabs[i] === tabName ? 'block' : 'none';
                                }
                            }
                            
                            // Update nav tab active state
                            var navTabs = document.querySelectorAll('.nav-tab');
                            for (var i = 0; i < navTabs.length; i++) {
                                navTabs[i].classList.remove('active');
                            }
                            var tabContents = document.querySelectorAll('.tab-content');
                            for (var i = 0; i < tabContents.length; i++) {
                                tabContents[i].classList.remove('active');
                            }
                            
                            // Show selected tab
                            var selectedTab = document.getElementById(tabName + '-tab');
                            if (selectedTab) {
                                selectedTab.classList.add('active');
                            }
                            
                            // Find and activate the nav button
                            var navButtons = document.querySelectorAll('.nav-tab');
                            for (var i = 0; i < navButtons.length; i++) {
                                var button = navButtons[i];
                                if (button.onclick && button.onclick.toString().includes(tabName)) {
                                    button.classList.add('active');
                                    break;
                                }
                            }
                        };
                        
                        // Add wallet functions
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
                    }
                })
                .catch(function(error) {
                    console.error('❌ Error loading prices:', error);
                });
                
        }, 500);
    </script>

    <div class="container">
        <div class="header">
            <h1>🚀 TradeX Pro</h1>
            <p>AI-Powered Trading Bot</p>
            <div style="font-size: 0.8rem; color: #ccc;" id="userType">Loading...</div>
            <div style="font-size: 0.9rem; color: #4CAF50; margin-top: 5px;" id="balance">$10.00</div>
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

</body>
</html>`;
}