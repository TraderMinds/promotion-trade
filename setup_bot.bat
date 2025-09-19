@echo off
echo 🚀 TradeX Pro Telegram Bot Setup
echo ================================

echo.
echo 📋 Setup Steps:
echo 1. Get bot token from @BotFather
echo 2. Install Python dependencies
echo 3. Set environment variable
echo 4. Run the bot

echo.
echo 📱 Step 1: Create Telegram Bot
echo Go to @BotFather and create a new bot
echo Save the token you receive

echo.
echo 📦 Step 2: Install Dependencies
pip install -r requirements.txt

echo.
echo 🔧 Step 3: Set Your Bot Token
echo Set environment variable TELEGRAM_BOT_TOKEN=your_token_here
echo Or edit telegram_bot.py and replace YOUR_BOT_TOKEN_HERE

echo.
echo 🚀 Step 4: Run Your Bot
echo python telegram_bot.py

echo.
echo 📖 Need help? Check TELEGRAM_BOT_SETUP.md for detailed instructions
echo.
pause