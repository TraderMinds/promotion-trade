# 🚀 Telegram Bot Setup Guide

## Overview
This guide will help you integrate the TradeX Pro mini app into your Telegram bot.

## Prerequisites
1. **Telegram Bot Token**: You need a bot token from @BotFather
2. **Mini App URL**: Your deployed mini app URL (already deployed at https://promotion-trade-bot.tradermindai.workers.dev/miniapp)

## Step 1: Create Your Telegram Bot

1. **Message @BotFather** on Telegram
2. **Send** `/newbot`
3. **Choose a name** for your bot (e.g., "TradeX Pro Bot")
4. **Choose a username** (e.g., "tradex_pro_bot")
5. **Save the bot token** - you'll need this

## Step 2: Configure Your Bot

### Set Bot Commands
Message @BotFather with `/setcommands` and choose your bot, then send:
```
start - Start trading with AI-powered signals
trade - Open trading mini app
help - Get help and support
stats - View your trading statistics
deposit - Add funds to your account
```

### Set Bot Description
Message @BotFather with `/setdescription` and send:
```
🚀 TradeX Pro - AI-Powered Trading Bot

Experience the future of trading with our advanced AI signals, real-time price tracking, and intuitive mini app interface. Start trading with just $100 and watch your profits grow!

Features:
✅ Real-time BTC price tracking
✅ Advanced AI trading signals
✅ 20-second live trading simulation
✅ Detailed profit/loss tracking
✅ Achievement system & rewards
✅ Secure Telegram integration

Ready to trade? Send /start to begin!
```

### Set About Text
Message @BotFather with `/setabouttext` and send:
```
AI-powered trading bot with real-time signals and mini app interface. Trade BTC with confidence using advanced technical analysis.
```

## Step 3: Set Up the Mini App

### Register Mini App with BotFather
1. Message @BotFather
2. Send `/newapp`
3. Choose your bot
4. **Send the mini app URL**: `https://promotion-trade-bot.tradermindai.workers.dev/miniapp`
5. **Choose a short name**: `tradexpro` (will be used in the URL)
6. **Send a title**: `TradeX Pro Trading`
7. **Send a description**: `AI-powered trading platform with real-time signals`
8. **Send a photo** (1080x1080px recommended): Upload a trading-themed image

## Step 4: Update Your Bot Code

Here's a simple Python bot script to handle user interactions:

```python
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

# Replace with your bot token
BOT_TOKEN = "YOUR_BOT_TOKEN_HERE"
MINIAPP_URL = "https://promotion-trade-bot.tradermindai.workers.dev/miniapp"

logging.basicConfig(level=logging.INFO)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Send welcome message with mini app button"""
    keyboard = [
        [InlineKeyboardButton("🚀 Open TradeX Pro", web_app=WebAppInfo(url=MINIAPP_URL))],
        [InlineKeyboardButton("📊 View Stats", callback_data="stats")],
        [InlineKeyboardButton("💰 Deposit", callback_data="deposit")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    welcome_text = f"""
🚀 **Welcome to TradeX Pro!**

Hi {update.effective_user.first_name}! Ready to start AI-powered trading?

💎 **What you get:**
• Real-time BTC price tracking
• Advanced AI trading signals  
• 20-second live trading simulation
• Detailed profit/loss analytics
• Achievement rewards system

💰 **Starting Balance:** $10,000 (Demo)
📈 **Minimum Trade:** $100
🎯 **Demo Mode:** Always profitable for learning

Click "Open TradeX Pro" below to start trading!
    """
    
    await update.message.reply_text(
        welcome_text, 
        reply_markup=reply_markup,
        parse_mode='Markdown'
    )

async def trade_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Direct access to trading mini app"""
    keyboard = [[InlineKeyboardButton("🚀 Open Trading App", web_app=WebAppInfo(url=MINIAPP_URL))]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "🚀 Ready to trade? Click the button below to open TradeX Pro:",
        reply_markup=reply_markup
    )

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show help information"""
    help_text = """
🔧 **TradeX Pro Help**

**Commands:**
• `/start` - Get started with the bot
• `/trade` - Open trading mini app
• `/help` - Show this help message
• `/stats` - View your statistics

**How to Trade:**
1. Click "Open TradeX Pro" button
2. Enter trade amount ($100-$1000)
3. Follow AI signals (BUY/SELL)
4. Watch live profit/loss for 20 seconds
5. Collect your profits!

**Features:**
• Real-time BTC prices
• AI-powered trading signals
• Live P&L tracking
• Chart markers for trades
• Achievement system

**Support:** Contact @your_support_username
    """
    
    await update.message.reply_text(help_text, parse_mode='Markdown')

def main():
    """Start the bot"""
    application = Application.builder().token(BOT_TOKEN).build()
    
    # Handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("trade", trade_command))
    application.add_handler(CommandHandler("help", help_command))
    
    # Start polling
    application.run_polling()

if __name__ == '__main__':
    main()
```

## Step 5: Environment Variables

Update your Cloudflare Worker environment variables:

1. Go to Cloudflare Workers dashboard
2. Select your worker
3. Go to Settings → Variables
4. Add/Update:
   - `TELEGRAM_BOT_TOKEN`: Your actual bot token
   - `BASE_URL`: `https://promotion-trade-bot.tradermindai.workers.dev`
   - `MINIAPP_URL`: `https://promotion-trade-bot.tradermindai.workers.dev/miniapp`

## Step 6: Test Your Bot

1. **Start your bot script** (if using Python)
2. **Message your bot** on Telegram
3. **Send** `/start`
4. **Click** "Open TradeX Pro" button
5. **Test trading** functionality

## Advanced Features

### Webhook Setup (Recommended for Production)
Instead of polling, use webhooks for better performance:

```python
# Add to your main() function
application.run_webhook(
    listen="0.0.0.0",
    port=int(PORT),
    url_path=TOKEN,
    webhook_url=f"https://yourserver.com/{TOKEN}"
)
```

### Database Integration
The mini app already supports user-specific data storage. Each Telegram user gets:
- Persistent balance
- Trading history
- Achievement progress
- Personal statistics

## Troubleshooting

### Common Issues:
1. **Mini app doesn't load**: Check MINIAPP_URL is correct
2. **Trading fails**: Ensure API endpoints are working
3. **User data not saving**: Verify KV namespace configuration

### Debug Commands:
```bash
# Test mini app URL
curl https://promotion-trade-bot.tradermindai.workers.dev/miniapp

# Test price API  
curl https://promotion-trade-bot.tradermindai.workers.dev/api/price

# Check deployment
wrangler tail
```

## Security Notes

1. **Never share your bot token**
2. **Use environment variables** for sensitive data
3. **Validate user input** in your bot
4. **Monitor API usage** for abuse

## Support

If you need help:
1. Check Cloudflare Workers logs
2. Test API endpoints individually
3. Verify Telegram bot configuration
4. Check mini app console for errors

---

🚀 **Your TradeX Pro bot is ready to launch!**