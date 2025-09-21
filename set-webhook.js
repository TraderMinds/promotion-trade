// Script to set Telegram webhook
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🤖 Setting up Telegram Bot Webhook\n');

rl.question('Enter your Bot Token (from @BotFather): ', async (botToken) => {
  if (!botToken) {
    console.log('❌ Bot token is required!');
    rl.close();
    return;
  }

  const webhookUrl = 'https://promotion-trade-bot.tradermindai.workers.dev/webhook';
  
  console.log('\n🔗 Setting webhook URL:', webhookUrl);
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query']
      })
    });
    
    const result = await response.json();
    
    if (result.ok) {
      console.log('✅ Webhook set successfully!');
      console.log('📝 Description:', result.description);
      
      // Test the webhook
      console.log('\n🧪 Testing webhook...');
      const webhookInfo = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
      const info = await webhookInfo.json();
      
      if (info.ok) {
        console.log('📊 Webhook Info:');
        console.log('   URL:', info.result.url);
        console.log('   Pending updates:', info.result.pending_update_count);
        console.log('   Last error date:', info.result.last_error_date || 'None');
        console.log('   Last error message:', info.result.last_error_message || 'None');
      }
      
      console.log('\n🎉 Your bot is ready! Try sending /start to your bot.');
      
    } else {
      console.log('❌ Failed to set webhook:', result.description);
    }
    
  } catch (error) {
    console.log('❌ Error setting webhook:', error.message);
  }
  
  rl.close();
});