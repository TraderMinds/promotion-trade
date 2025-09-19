#!/usr/bin/env python3
"""
TradeX Pro Telegram Bot - Simple Version
Compatible with multiple python-telegram-bot versions
"""

import logging
import os
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes, CallbackQueryHandler

# Configuration - Your bot token is set here
BOT_TOKEN = "8467514896:AAE0rqZVPIWTioa_LeP6_ODa5mxgSKzcpMk"
MINIAPP_URL = "https://promotion-trade-bot.tradermindai.workers.dev/miniapp"

# Set up logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Send welcome message with mini app button"""
    user = update.effective_user
    
    keyboard = [
        [InlineKeyboardButton("🚀 Open TradeX Pro", web_app=WebAppInfo(url=MINIAPP_URL))],
        [
            InlineKeyboardButton("📊 My Stats", callback_data="stats"),
            InlineKeyboardButton("💰 Deposit", callback_data="deposit")
        ],
        [InlineKeyboardButton("❓ Help", callback_data="help")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    welcome_text = f"""🚀 **Welcome to TradeX Pro, {user.first_name}!**

Your AI-powered trading companion is ready! 

💎 **Features:**
• Real-time BTC price tracking
• AI trading signals  
• Live profit/loss tracking
• Chart markers for trades
• Achievement rewards

💰 **Demo Account:** $10,000
📈 **Minimum Trade:** $100

Ready to start trading?"""
    
    await update.message.reply_text(
        welcome_text, 
        reply_markup=reply_markup,
        parse_mode='Markdown'
    )

async def trade_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Quick access to trading mini app"""
    keyboard = [[InlineKeyboardButton("🚀 Start Trading", web_app=WebAppInfo(url=MINIAPP_URL))]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "📈 **Ready to Trade?**\\n\\nClick below to open your trading dashboard:",
        reply_markup=reply_markup,
        parse_mode='Markdown'
    )

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show help"""
    help_text = """🔧 **TradeX Pro Help**

**Commands:**
• `/start` - Main menu
• `/trade` - Open trading app
• `/help` - This help

**How to Trade:**
1. Click "Open TradeX Pro"
2. Follow AI signals (BUY/SELL)
3. Enter amount ($100-$1000)
4. Watch live profits!

**Features:**
• Real-time BTC prices
• AI trading signals
• Live P&L tracking
• Achievement rewards

Happy Trading! 🚀"""
    
    await update.message.reply_text(help_text, parse_mode='Markdown')

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle button callbacks"""
    query = update.callback_query
    await query.answer()
    
    if query.data == "stats":
        stats_text = f"""📊 **Your Trading Stats**

👤 **Trader:** {query.from_user.first_name}
💰 **Balance:** $10,000 (Demo)
📈 **Trades:** 0
🏆 **Win Rate:** 0%

🚀 Ready to start? Open the mini app!"""
        
        keyboard = [[InlineKeyboardButton("🚀 Start Trading", web_app=WebAppInfo(url=MINIAPP_URL))]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(stats_text, reply_markup=reply_markup, parse_mode='Markdown')
    
    elif query.data == "deposit":
        deposit_text = """💰 **Deposit Funds**

🎮 **Demo Mode Active**
You have $10,000 demo funds to practice!

🚀 Practice unlimited trades risk-free."""
        
        keyboard = [[InlineKeyboardButton("🚀 Practice Trading", web_app=WebAppInfo(url=MINIAPP_URL))]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(deposit_text, reply_markup=reply_markup, parse_mode='Markdown')
    
    elif query.data == "help":
        await help_command(update, context)

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle any text message"""
    keyboard = [[InlineKeyboardButton("🚀 Open TradeX Pro", web_app=WebAppInfo(url=MINIAPP_URL))]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "🤖 Ready to trade? Click below to open TradeX Pro!",
        reply_markup=reply_markup
    )

def main():
    """Start the bot"""
    print("🚀 Starting TradeX Pro Telegram Bot...")
    print(f"🔗 Mini App URL: {MINIAPP_URL}")
    print(f"🤖 Bot Token: {BOT_TOKEN[:10]}...")
    
    # Create application
    application = Application.builder().token(BOT_TOKEN).build()
    
    # Add handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("trade", trade_command))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CallbackQueryHandler(button_callback))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    
    # Start bot
    print("✅ Bot is running! Send /start to your bot on Telegram")
    print("🔗 Find your bot at: https://t.me/YourBotUsername")
    print("📱 Press Ctrl+C to stop")
    
    try:
        application.run_polling(allowed_updates=Update.ALL_TYPES)
    except KeyboardInterrupt:
        print("\\n🛑 Bot stopped by user")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == '__main__':
    main()