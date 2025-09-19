#!/usr/bin/env python3
"""
TradeX Pro Telegram Bot - Multilingual with Registration & Gift System
Supports 11 languages with user registration and $10 welcome bonus
"""

import logging
import json
import aiohttp
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes, CallbackQueryHandler

# Import language data
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from languages import LANGUAGES

# Configuration
BOT_TOKEN = "8467514896:AAE0rqZVPIWTioa_LeP6_ODa5mxgSKzcpMk"
MINIAPP_URL = "https://promotion-trade-bot.tradermindai.workers.dev/miniapp"
API_BASE = "https://promotion-trade-bot.tradermindai.workers.dev/api"

# User data storage (in production, use a database)
user_data = {}

# Set up logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

def get_user_language(user_id):
    """Get user's preferred language, default to English"""
    return user_data.get(user_id, {}).get('language', 'en')

def get_text(user_id, key):
    """Get localized text for user"""
    lang = get_user_language(user_id)
    return LANGUAGES.get(lang, LANGUAGES['en']).get(key, LANGUAGES['en'][key])

def is_user_registered(user_id):
    """Check if user is registered"""
    return user_id in user_data and user_data[user_id].get('registered', False)

async def save_user_to_server(user_id, user_info):
    """Save user data to the server"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{API_BASE}/user", json=user_info) as response:
                if response.status in [200, 409]:  # 409 = already exists
                    return True
    except Exception as e:
        logger.error(f"Error saving user to server: {e}")
    return False

async def get_user_from_server(user_id):
    """Get user data from server"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{API_BASE}/user/{user_id}") as response:
                if response.status == 200:
                    return await response.json()
    except Exception as e:
        logger.error(f"Error getting user from server: {e}")
    return None

async def language_selection(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show language selection menu"""
    user_id = update.effective_user.id
    
    # Create language selection keyboard (2 columns)
    keyboard = []
    languages = list(LANGUAGES.items())
    for i in range(0, len(languages), 2):
        row = []
        for j in range(2):
            if i + j < len(languages):
                lang_code, lang_data = languages[i + j]
                row.append(InlineKeyboardButton(
                    f"{lang_data['flag']} {lang_data['name']}", 
                    callback_data=f"lang_{lang_code}"
                ))
        keyboard.append(row)
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    text = LANGUAGES['en']['welcome_select_language']  # Always show in English first
    
    if update.message:
        await update.message.reply_text(text, reply_markup=reply_markup, parse_mode='Markdown')
    else:
        await update.callback_query.edit_message_text(text, reply_markup=reply_markup, parse_mode='Markdown')

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command"""
    user = update.effective_user
    user_id = user.id
    
    # Check if user exists in our data
    if user_id not in user_data:
        # New user - show language selection first
        user_data[user_id] = {
            'telegram_data': {
                'id': user_id,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'username': user.username
            },
            'registered': False,
            'language': 'en'
        }
        await language_selection(update, context)
        return
    
    # Existing user - check registration status
    if not is_user_registered(user_id):
        await show_registration(update, context)
    else:
        await show_main_menu(update, context)

async def show_registration(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show registration welcome with $10 gift offer"""
    user = update.effective_user
    user_id = user.id
    
    keyboard = [
        [InlineKeyboardButton(f"🎁 {get_text(user_id, 'register_success').split('!')[0]}!", callback_data="register")],
        [InlineKeyboardButton(get_text(user_id, 'language_button'), callback_data="change_language")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    text = get_text(user_id, 'welcome_register').format(user.first_name)
    
    if update.message:
        await update.message.reply_text(text, reply_markup=reply_markup, parse_mode='Markdown')
    else:
        await update.callback_query.edit_message_text(text, reply_markup=reply_markup, parse_mode='Markdown')

async def show_main_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show main menu for registered users"""
    user = update.effective_user
    user_id = user.id
    
    # Get user stats (mock for now)
    balance = user_data[user_id].get('balance', 10010.0)
    total_trades = user_data[user_id].get('total_trades', 0)
    win_rate = user_data[user_id].get('win_rate', 0.0)
    
    keyboard = [
        [InlineKeyboardButton(get_text(user_id, 'trade_button'), web_app=WebAppInfo(url=f"{MINIAPP_URL}?lang={get_user_language(user_id)}&user_id={user_id}"))],
        [
            InlineKeyboardButton(get_text(user_id, 'stats_button'), callback_data="stats"),
            InlineKeyboardButton(get_text(user_id, 'history_button'), callback_data="history")
        ],
        [
            InlineKeyboardButton(get_text(user_id, 'deposit_button'), callback_data="deposit"),
            InlineKeyboardButton(get_text(user_id, 'withdraw_button'), callback_data="withdraw")
        ],
        [InlineKeyboardButton(get_text(user_id, 'language_button'), callback_data="change_language")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    text = get_text(user_id, 'welcome_existing').format(user.first_name, balance, total_trades, win_rate)
    
    if update.message:
        await update.message.reply_text(text, reply_markup=reply_markup, parse_mode='Markdown')
    else:
        await update.callback_query.edit_message_text(text, reply_markup=reply_markup, parse_mode='Markdown')

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle button callbacks"""
    query = update.callback_query
    user_id = query.from_user.id
    await query.answer()
    
    if query.data.startswith("lang_"):
        # Language selection
        lang_code = query.data.split("_")[1]
        user_data[user_id]['language'] = lang_code
        
        if not is_user_registered(user_id):
            await show_registration(update, context)
        else:
            await show_main_menu(update, context)
    
    elif query.data == "register":
        # Handle registration and $10 gift
        user_data[user_id]['registered'] = True
        user_data[user_id]['balance'] = 10010.0  # $10,000 demo + $10 gift
        user_data[user_id]['total_trades'] = 0
        user_data[user_id]['win_rate'] = 0.0
        user_data[user_id]['transactions'] = []
        
        # Save to server
        await save_user_to_server(user_id, user_data[user_id])
        
        # Show success message
        text = get_text(user_id, 'register_success')
        keyboard = [[InlineKeyboardButton(get_text(user_id, 'trade_button'), web_app=WebAppInfo(url=f"{MINIAPP_URL}?lang={get_user_language(user_id)}&user_id={user_id}"))]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='Markdown')
    
    elif query.data == "change_language":
        await language_selection(update, context)
    
    elif query.data == "stats":
        balance = user_data[user_id].get('balance', 10010.0)
        total_trades = user_data[user_id].get('total_trades', 0)
        win_rate = user_data[user_id].get('win_rate', 0.0)
        
        stats_text = f"""📊 **{get_text(user_id, 'stats_button')}**

👤 **{query.from_user.first_name}**
💰 **{get_text(user_id, 'balance_label')}:** ${balance:.2f}
📈 **Total Trades:** {total_trades}
🏆 **Win Rate:** {win_rate:.1f}%
📊 **Total Profit:** ${balance - 10000:.2f}

🚀 Ready to trade more?"""
        
        keyboard = [
            [InlineKeyboardButton(get_text(user_id, 'trade_button'), web_app=WebAppInfo(url=f"{MINIAPP_URL}?lang={get_user_language(user_id)}&user_id={user_id}"))],
            [InlineKeyboardButton("🔙 Back", callback_data="back_to_menu")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(stats_text, reply_markup=reply_markup, parse_mode='Markdown')
    
    elif query.data == "history":
        transactions = user_data[user_id].get('transactions', [])
        
        if not transactions:
            history_text = f"📜 **{get_text(user_id, 'transaction_history')}**\\n\\n{get_text(user_id, 'no_transactions')}"
        else:
            history_text = f"📜 **{get_text(user_id, 'transaction_history')}**\\n\\n"
            for i, tx in enumerate(transactions[-5:], 1):  # Show last 5
                profit_emoji = "📈" if tx.get('profit', 0) >= 0 else "📉"
                history_text += f"{profit_emoji} **Trade {i}:** ${tx.get('profit', 0):.2f} ({tx.get('percentage', 0):.1f}%)\\n"
        
        keyboard = [
            [InlineKeyboardButton(get_text(user_id, 'trade_button'), web_app=WebAppInfo(url=f"{MINIAPP_URL}?lang={get_user_language(user_id)}&user_id={user_id}"))],
            [InlineKeyboardButton("🔙 Back", callback_data="back_to_menu")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(history_text, reply_markup=reply_markup, parse_mode='Markdown')
    
    elif query.data == "deposit":
        deposit_text = f"""💰 **{get_text(user_id, 'deposit_button')}**

🎮 **Demo Mode Active**
You have ${user_data[user_id].get('balance', 10010.0):.2f} demo funds!

🔜 **Coming Soon:**
• Real money deposits
• Cryptocurrency support
• Multiple payment methods

🚀 For now, enjoy unlimited demo trading!"""
        
        keyboard = [
            [InlineKeyboardButton(get_text(user_id, 'trade_button'), web_app=WebAppInfo(url=f"{MINIAPP_URL}?lang={get_user_language(user_id)}&user_id={user_id}"))],
            [InlineKeyboardButton("🔙 Back", callback_data="back_to_menu")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(deposit_text, reply_markup=reply_markup, parse_mode='Markdown')
    
    elif query.data == "withdraw":
        withdraw_text = f"""💸 **{get_text(user_id, 'withdraw_button')}**

🎮 **Demo Mode**
Your balance: ${user_data[user_id].get('balance', 10010.0):.2f}

🔜 **Real withdrawals coming soon:**
• Bank transfers
• Cryptocurrency
• E-wallets

🚀 Keep trading to increase your demo balance!"""
        
        keyboard = [
            [InlineKeyboardButton(get_text(user_id, 'trade_button'), web_app=WebAppInfo(url=f"{MINIAPP_URL}?lang={get_user_language(user_id)}&user_id={user_id}"))],
            [InlineKeyboardButton("🔙 Back", callback_data="back_to_menu")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(withdraw_text, reply_markup=reply_markup, parse_mode='Markdown')
    
    elif query.data == "back_to_menu":
        await show_main_menu(update, context)

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle any text message"""
    user_id = update.effective_user.id
    
    if not is_user_registered(user_id):
        await start(update, context)
    else:
        keyboard = [[InlineKeyboardButton(get_text(user_id, 'trade_button'), web_app=WebAppInfo(url=f"{MINIAPP_URL}?lang={get_user_language(user_id)}&user_id={user_id}"))]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            f"🤖 {get_text(user_id, 'trade_button')}!",
            reply_markup=reply_markup
        )

def main():
    """Start the bot"""
    print("🚀 Starting TradeX Pro Multilingual Bot...")
    print(f"🔗 Mini App URL: {MINIAPP_URL}")
    print(f"🌍 Supported Languages: {len(LANGUAGES)}")
    
    # Create application
    application = Application.builder().token(BOT_TOKEN).build()
    
    # Add handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CallbackQueryHandler(button_callback))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    
    # Start bot
    print("✅ Bot is running! Supports:")
    for lang_code, lang_data in LANGUAGES.items():
        print(f"   {lang_data['flag']} {lang_data['name']} ({lang_code})")
    print("📱 Press Ctrl+C to stop")
    
    try:
        application.run_polling(allowed_updates=Update.ALL_TYPES)
    except KeyboardInterrupt:
        print("\\n🛑 Bot stopped by user")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == '__main__':
    main()