#!/usr/bin/env python3
"""
TradeX Pro Telegram Bot
A simple bot to integrate with the TradeX Pro mini app
"""

import logging
import os
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes, CallbackQueryHandler

# Configuration
BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN') or os.environ.get('TELEGRAM_BOT_TOKEN', 'YOUR_BOT_TOKEN_HERE')
MINIAPP_URL = "https://promotion-trade-bot.tradermindai.workers.dev/miniapp"

# If still not set, try direct assignment (you can edit this)
if BOT_TOKEN == 'YOUR_BOT_TOKEN_HERE':
    # You can uncomment and edit the line below to set your token directly
    BOT_TOKEN = "8467514896:AAE0rqZVPIWTioa_LeP6_ODa5mxgSKzcpMk"  # Replace with your actual token
    # BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE'  # Keep this if you want to use env vars only

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
        [
            InlineKeyboardButton("🏆 Achievements", callback_data="achievements"),
            InlineKeyboardButton("❓ Help", callback_data="help")
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    welcome_text = f"""
🚀 **Welcome to TradeX Pro, {user.first_name}!**

Your AI-powered trading companion is ready! Experience the future of trading with real-time signals and live profit tracking.

💎 **What awaits you:**
• Real-time BTC price tracking
• Advanced AI trading signals  
• 20-second live trading simulation
• Detailed profit/loss analytics
• Achievement & rewards system
• Secure Telegram integration

💰 **Your Demo Account:** $10,000
📈 **Minimum Trade:** $100
🎯 **Demo Mode:** Learn risk-free!

Ready to make your first profitable trade?
    """
    
    await update.message.reply_text(
        welcome_text, 
        reply_markup=reply_markup,
        parse_mode='Markdown'
    )

async def trade_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Quick access to trading mini app"""
    keyboard = [
        [InlineKeyboardButton("🚀 Open Trading Dashboard", web_app=WebAppInfo(url=MINIAPP_URL))],
        [InlineKeyboardButton("🔙 Back to Menu", callback_data="back_to_menu")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    trade_text = """
📈 **Ready to Trade?**

Click below to access your TradeX Pro dashboard:

• View real-time BTC prices
• Follow AI trading signals
• Execute profitable trades
• Track your performance

💡 **Pro Tip:** Follow the AI signals for best results!
    """
    
    await update.message.reply_text(
        trade_text,
        reply_markup=reply_markup,
        parse_mode='Markdown'
    )

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show comprehensive help"""
    help_text = """
🔧 **TradeX Pro Help Center**

**🎯 Quick Start:**
1. Click "Open TradeX Pro" 
2. Follow the AI trading signals
3. Enter amount ($100-$1000)
4. Watch profits grow in real-time!

**📱 Commands:**
• `/start` - Main menu & mini app
• `/trade` - Quick access to trading
• `/help` - This help message
• `/stats` - Your trading statistics

**🤖 AI Trading Signals:**
• **BUY** 📈 - AI predicts price increase
• **SELL** 📉 - AI predicts price decrease
• **Confidence:** High/Medium indicator

**🎮 How Trading Works:**
1. AI analyzes real-time BTC data
2. Provides BUY/SELL recommendation
3. You enter trade amount
4. 20-second live tracking begins
5. Real-time profit/loss updates
6. Automatic profit calculation

**🏆 Achievement System:**
• First Trade: $50 bonus
• Profitable Trader: $100 bonus
• Big Spender: $200 bonus
• Trading Streak: $150 bonus
• And many more rewards!

**📊 Features:**
• Real-time price charts
• Live P&L tracking
• Trade history
• Performance analytics
• Risk-free demo mode

**🔐 Security:**
Your data is encrypted and secure. We use Telegram's built-in security for authentication.

**❓ Support:**
Having issues? Contact @your_support_username

Happy Trading! 🚀
    """
    
    await update.message.reply_text(help_text, parse_mode='Markdown')

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle button callbacks"""
    query = update.callback_query
    await query.answer()
    
    if query.data == "stats":
        stats_text = f"""
📊 **Your Trading Statistics**

👤 **Trader:** {query.from_user.first_name}
💰 **Current Balance:** $10,000 (Demo)
📈 **Total Trades:** 0
🏆 **Win Rate:** 0%
💎 **Total Profit:** $0.00

🚀 **Ready to start trading?** Open the mini app to begin your journey!

*Note: This is demo mode. Real trading coming soon!*
        """
        
        keyboard = [
            [InlineKeyboardButton("🚀 Start Trading", web_app=WebAppInfo(url=MINIAPP_URL))],
            [InlineKeyboardButton("🔙 Back to Menu", callback_data="back_to_menu")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(
            stats_text,
            reply_markup=reply_markup,
            parse_mode='Markdown'
        )
    
    elif query.data == "deposit":
        deposit_text = """
💰 **Deposit Funds**

🎮 **Demo Mode Active**
You're currently using demo funds ($10,000) to learn the platform risk-free!

🔜 **Coming Soon:**
• Real money deposits
• Cryptocurrency deposits  
• Credit card integration
• Bank transfers

🚀 **For now:** Enjoy unlimited demo trading to master the AI signals and platform features!

💡 **Tip:** Practice makes perfect! Use demo mode to understand the AI signals before real trading.
        """
        
        keyboard = [
            [InlineKeyboardButton("🚀 Practice Trading", web_app=WebAppInfo(url=MINIAPP_URL))],
            [InlineKeyboardButton("🔙 Back to Menu", callback_data="back_to_menu")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(
            deposit_text,
            reply_markup=reply_markup,
            parse_mode='Markdown'
        )
    
    elif query.data == "achievements":
        achievements_text = """
🏆 **Achievement Center**

**🎯 Available Rewards:**
• 🥇 First Trade - $50 bonus
• 📈 Profitable Trader - $100 bonus  
• 💰 Big Spender - $200 bonus
• 🔥 Trading Streak - $150 bonus
• ⚡ Speed Trader - $75 bonus
• 📊 Analyst - $125 bonus
• 💎 Diamond Hands - $300 bonus
• 🚀 Rocket Trader - $500 bonus

**🎮 How to Unlock:**
Start trading in the mini app to automatically unlock achievements and earn bonus rewards!

**💡 Pro Tip:** Each achievement comes with cash bonuses to boost your trading balance!
        """
        
        keyboard = [
            [InlineKeyboardButton("🚀 Start Earning", web_app=WebAppInfo(url=MINIAPP_URL))],
            [InlineKeyboardButton("🔙 Back to Menu", callback_data="back_to_menu")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(
            achievements_text,
            reply_markup=reply_markup,
            parse_mode='Markdown'
        )
    
    elif query.data == "help":
        await help_command(update, context)
    
    elif query.data == "back_to_menu":
        await start(update, context)

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle text messages"""
    text = update.message.text.lower()
    
    if any(word in text for word in ['trade', 'trading', 'buy', 'sell']):
        await trade_command(update, context)
    elif any(word in text for word in ['help', 'support', 'how']):
        await help_command(update, context)
    elif any(word in text for word in ['stats', 'statistics', 'balance']):
        keyboard = [[InlineKeyboardButton("📊 View Stats", callback_data="stats")]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await update.message.reply_text(
            "📊 Click below to view your trading statistics:",
            reply_markup=reply_markup
        )
    else:
        # Default response
        keyboard = [[InlineKeyboardButton("🚀 Open TradeX Pro", web_app=WebAppInfo(url=MINIAPP_URL))]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            "🤖 I'm your TradeX Pro assistant! Click below to start trading or send /help for more options.",
            reply_markup=reply_markup
        )

async def error_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Log errors"""
    logger.warning(f'Update {update} caused error {context.error}')

def main():
    """Start the bot"""
    if BOT_TOKEN == 'YOUR_BOT_TOKEN_HERE':
        print("❌ Please set your TELEGRAM_BOT_TOKEN environment variable or update the script!")
        print("💡 Get your token from @BotFather on Telegram")
        return
    
    print("🚀 Starting TradeX Pro Telegram Bot...")
    print(f"🔗 Mini App URL: {MINIAPP_URL}")
    
    # Create application
    application = Application.builder().token(BOT_TOKEN).build()
    
    # Add handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("trade", trade_command))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CallbackQueryHandler(button_callback))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    
    # Add error handler
    application.add_error_handler(error_handler)
    
    # Start bot
    print("✅ Bot is running! Send /start to your bot on Telegram")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main()