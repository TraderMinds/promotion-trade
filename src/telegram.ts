import { logEvent } from './utils.js';
import type { Env } from './worker.js';

export async function handleTelegramWebhook(request: Request, env: Env, getUserData: (id:number, env: Env)=>Promise<any>, saveUserData: (id:number, data:any, env:Env)=>Promise<void>): Promise<Response> {
  try {
    const update = await request.json() as any;
    logEvent('telegram.update', { hasMessage: !!update.message });

    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const userId = update.message.from.id;
      const text = update.message.text;
      const firstName = update.message.from.first_name || 'User';

      if (text === '/start') {
        const userData = await getUserData(userId, env);
        if (!userData) {
          const newUserData = {
            id: userId,
            firstName,
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
            actionButton(env, userId), env);
        } else {
          await sendTelegramMessage(chatId,
            `👋 Welcome back, ${firstName}!\n\n` +
            `💰 Your balance: $${userData.balance.toFixed(2)}\n` +
            `📊 Total trades: ${userData.totalTrades || 0}\n` +
            `🎯 Win rate: ${userData.winRate || 0}%\n\n` +
            `Ready to continue trading?`,
            actionButton(env, userId), env);
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
            actionButton(env, userId), env);
        } else {
          await sendTelegramMessage(chatId, '❌ User not found. Please send /start first.', {}, env);
        }
      } else if (text === '/help') {
        await sendTelegramMessage(chatId,
          `🤖 TradeX Pro Help\n\n` +
          `Commands:\n` +
          `/start - Start using the bot\n` +
          `/balance - Check your balance\n` +
          `/help - Show this help message\n\n` +
          `🚀 Use the web app for full trading functionality!`,
          actionButton(env, userId), env);
      } else {
        await sendTelegramMessage(chatId,
          `🤔 I don't understand that command.\n\n` +
          `Try:\n` +
          `/start - Get started\n` +
          `/balance - Check balance\n` +
          `/help - Get help\n\n` +
          `Or use the web app for trading:`,
          actionButton(env, userId), env);
      }
    }
    return new Response('OK');
  } catch (error) {
    logEvent('telegram.webhook.error', { message: (error as any)?.message }, 'error');
    return new Response('Error', { status: 500 });
  }
}

function actionButton(env: Env, userId: number) {
  return {
    reply_markup: {
      inline_keyboard: [[{
        text: '🚀 Open TradeX Pro',
        web_app: { url: `${env.MINIAPP_URL}?user_id=${userId}&from_bot=1` }
      }]]
    }
  };
}

export async function sendTelegramMessage(chatId: number, text: string, options: any = {}, env: Env): Promise<void> {
  try {
    const BOT_TOKEN = env.BOT_TOKEN_SECRET || env.TELEGRAM_BOT_TOKEN;
    if (!BOT_TOKEN) {
      logEvent('telegram.send.missing_token', {}, 'error');
      return;
    }
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const payload = { chat_id: chatId, text, parse_mode: 'HTML', ...options };
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) {
      const errorText = await response.text();
      logEvent('telegram.send.error', { status: response.status, errorText }, 'error');
    } else {
      logEvent('telegram.send.success', { chatId });
    }
  } catch (e:any) {
    logEvent('telegram.send.exception', { message: e.message }, 'error');
  }
}
