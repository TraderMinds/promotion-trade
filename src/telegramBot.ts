// Telegram Bot Handlers for TradeX Pro
// Handles registration, login, profile management, and user verification

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    chat: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      type: string;
    };
    date: number;
    text?: string;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    message?: any;
    data?: string;
  };
}

interface UserProfile {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  email?: string;
  balance: number;
  isGroupMember: boolean;
  registrationCompleted: boolean;
  createdAt: string;
  lastActive: string;
}

const REQUIRED_GROUP_ID = "-1003071589642";
const SUPPORT_USERNAME = "@CryptoAlexanderJ";

export async function handleTelegramUpdate(update: TelegramUpdate, env: any): Promise<Response> {
  try {
    console.log('[Bot] Received update:', JSON.stringify(update));

    if (update.message) {
      return await handleMessage(update.message, env);
    }

    if (update.callback_query) {
      return await handleCallbackQuery(update.callback_query, env);
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('[Bot] Error handling update:', error);
    return new Response('Error', { status: 500 });
  }
}

async function handleMessage(message: any, env: any): Promise<Response> {
  const userId = message.from.id;
  const chatId = message.chat.id;
  const text = message.text || '';
  const isGroupChat = message.chat.type === 'group' || message.chat.type === 'supergroup';

  console.log(`[Bot] Message from ${userId}: ${text} (Chat type: ${message.chat.type})`);

  // In groups, only respond to commands or bot mentions
  if (isGroupChat) {
    // Only process if it's a command (starts with /) or mentions the bot
    const isBotMention = text.includes('@') && text.toLowerCase().includes('bot');
    const isCommand = text.startsWith('/');
    
    if (!isCommand && !isBotMention) {
      // Ignore regular group messages
      return new Response('OK', { status: 200 });
    }
  }

  // Handle commands
  if (text.startsWith('/start')) {
    return await handleStartCommand(userId, chatId, message.from, env);
  }

  if (text.startsWith('/balance')) {
    return await handleBalanceCommand(userId, chatId, env);
  }

  if (text.startsWith('/profile')) {
    return await handleProfileCommand(userId, chatId, env);
  }

  if (text.startsWith('/support')) {
    return await handleSupportCommand(userId, chatId, env);
  }

  // Handle registration flow (only in private chats)
  if (!isGroupChat) {
    const userState = await getUserState(userId, env);
    if (userState && !userState.registrationCompleted) {
      return await handleRegistrationFlow(userId, chatId, text, message.from, env);
    }

    // Default response only for private chats
    await sendMessage(chatId, '❓ Unknown command. Use /start to begin!', env);
  }

  return new Response('OK', { status: 200 });
}

async function handleStartCommand(userId: number, chatId: number, fromUser: any, env: any): Promise<Response> {
  console.log(`[Bot] /start command from user ${userId}`);

  // Check if user exists
  let userProfile = await getUserProfile(userId, env);
  
  if (!userProfile) {
    // Create new user profile
    userProfile = {
      id: userId,
      firstName: fromUser.first_name,
      lastName: fromUser.last_name,
      username: fromUser.username,
      email: undefined,
      balance: 0,
      isGroupMember: false,
      registrationCompleted: false,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };
    await saveUserProfile(userProfile, env);
  }

  // Update last active
  userProfile.lastActive = new Date().toISOString();
  await saveUserProfile(userProfile, env);

  // Check registration status and start validation flow
  return await validateUserAndRespond(userProfile, chatId, env);
}

async function validateUserAndRespond(userProfile: UserProfile, chatId: number, env: any): Promise<Response> {
  const validationResults = await validateUserRequirements(userProfile, env);
  
  if (validationResults.allValid) {
    // All requirements met - show success and miniapp
    const miniappUrl = `${env.BASE_URL || env.MINIAPP_URL}/miniapp?user_id=${userProfile.id}&from_bot=1`;
    
    const message = `🎉 *Welcome to TradeX Pro!*

✅ All requirements completed!
💰 Balance: $${userProfile.balance.toFixed(2)}

🚀 *Ready to Trade?*
Click the button below to open your trading platform:`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '🚀 Open Trading Platform', web_app: { url: miniappUrl } }],
        [
          { text: '💰 Check Balance', callback_data: 'balance' },
          { text: '👤 Profile', callback_data: 'profile' }
        ],
        [{ text: '💬 Contact Support', callback_data: 'support' }]
      ]
    };

    await sendMessage(chatId, message, env, keyboard);
    return new Response('OK', { status: 200 });
  }

  // Show what needs to be completed
  let message = "🔐 *TradeX Pro Registration*\n\n";
  message += "Please complete the following requirements:\n\n";

  if (!validationResults.hasName) {
    message += "❌ Full name required\n";
  } else {
    message += "✅ Name confirmed\n";
  }

  if (!validationResults.hasEmail) {
    message += "❌ Email address required\n";
  } else {
    message += "✅ Email confirmed\n";
  }

  if (!validationResults.isGroupMember) {
    message += "❌ Must join our Telegram group\n";
  } else {
    message += "✅ Group membership confirmed\n";
  }

  message += "\n📝 *Next Steps:*\n";

  const keyboard = { inline_keyboard: [] as any[] };

  if (!validationResults.hasName) {
    message += "1️⃣ Click 'Set Name' to enter your full name\n";
    keyboard.inline_keyboard.push([{ text: '📝 Set Full Name', callback_data: 'set_name' }]);
  }

  if (!validationResults.hasEmail) {
    message += "2️⃣ Click 'Set Email' to enter your email\n";
    keyboard.inline_keyboard.push([{ text: '📧 Set Email', callback_data: 'set_email' }]);
  }

  if (!validationResults.isGroupMember) {
    message += "3️⃣ Join our Telegram group and click 'Verify Membership'\n";
    keyboard.inline_keyboard.push([
      { text: '📢 Join Group', url: `https://t.me/c/${REQUIRED_GROUP_ID.replace('-100', '')}/1` },
      { text: '✅ Verify Membership', callback_data: 'verify_group' }
    ]);
  }

  await sendMessage(chatId, message, env, keyboard);
  return new Response('OK', { status: 200 });
}

async function handleCallbackQuery(callbackQuery: any, env: any): Promise<Response> {
  const userId = callbackQuery.from.id;
  const chatId = callbackQuery.message?.chat?.id;
  const data = callbackQuery.data;

  console.log(`[Bot] Callback query from ${userId}: ${data}`);

  // Answer callback query to remove loading state
  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN_SECRET}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQuery.id,
      text: 'Processing...'
    })
  });

  switch (data) {
    case 'set_name':
      await sendMessage(chatId, '📝 *Enter Your Full Name*\n\nPlease type your full name (first and last name):', env);
      await setUserState(userId, { awaitingName: true }, env);
      break;

    case 'set_email':
      await sendMessage(chatId, '📧 *Enter Your Email*\n\nPlease type your email address:', env);
      await setUserState(userId, { awaitingEmail: true }, env);
      break;

    case 'verify_group':
      return await verifyGroupMembership(userId, chatId, env);

    case 'balance':
      return await handleBalanceCommand(userId, chatId, env);

    case 'profile':
      return await handleProfileCommand(userId, chatId, env);

    case 'support':
      return await handleSupportCommand(userId, chatId, env);

    case 'edit_profile':
      return await showEditProfileMenu(userId, chatId, env);
  }

  return new Response('OK', { status: 200 });
}

async function handleRegistrationFlow(userId: number, chatId: number, text: string, fromUser: any, env: any): Promise<Response> {
  const userState = await getUserState(userId, env);
  let userProfile = await getUserProfile(userId, env);

  if (!userProfile) return new Response('OK', { status: 200 });

  if (userState?.awaitingName) {
    // Validate name (should have at least first and last name)
    const nameParts = text.trim().split(' ');
    if (nameParts.length < 2) {
      await sendMessage(chatId, '❌ Please enter your full name (first and last name).\n\nExample: John Smith', env);
      return new Response('OK', { status: 200 });
    }

    userProfile.firstName = nameParts[0];
    userProfile.lastName = nameParts.slice(1).join(' ');
    await saveUserProfile(userProfile, env);
    await clearUserState(userId, env);

    await sendMessage(chatId, `✅ *Name Updated!*\n\nHello ${userProfile.firstName} ${userProfile.lastName}! 👋`, env);
    
    // Continue validation flow
    return await validateUserAndRespond(userProfile, chatId, env);
  }

  if (userState?.awaitingEmail) {
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(text.trim())) {
      await sendMessage(chatId, '❌ Please enter a valid email address.\n\nExample: your.email@gmail.com', env);
      return new Response('OK', { status: 200 });
    }

    userProfile.email = text.trim();
    await saveUserProfile(userProfile, env);
    await clearUserState(userId, env);

    await sendMessage(chatId, `✅ *Email Updated!*\n\nEmail set to: ${userProfile.email}`, env);
    
    // Continue validation flow
    return await validateUserAndRespond(userProfile, chatId, env);
  }

  return new Response('OK', { status: 200 });
}

async function verifyGroupMembership(userId: number, chatId: number, env: any): Promise<Response> {
  try {
    // Check if user is member of the required group
    const response = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN_SECRET}/getChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: REQUIRED_GROUP_ID,
        user_id: userId
      })
    });

    const result = await response.json();
    console.log('[Bot] Group membership check result:', result);

    const isValidMember = result.ok && 
      result.result && 
      ['member', 'administrator', 'creator'].includes(result.result.status);

    let userProfile = await getUserProfile(userId, env);
    if (!userProfile) return new Response('OK', { status: 200 });

    if (isValidMember) {
      userProfile.isGroupMember = true;
      
      // Check if this completes registration
      const validation = await validateUserRequirements(userProfile, env);
      if (validation.allValid && !userProfile.registrationCompleted) {
        userProfile.registrationCompleted = true;
        userProfile.balance = 10.00; // Add $10 gift bonus
      }

      await saveUserProfile(userProfile, env);

      if (userProfile.registrationCompleted) {
        await sendMessage(chatId, '🎉 *Registration Complete!*\n\n✅ Group membership verified!\n💰 $10.00 gift added to your balance!\n\nWelcome to TradeX Pro! 🚀', env);
      } else {
        await sendMessage(chatId, '✅ *Group membership verified!*\n\nGreat! You\'re now a member of our community.', env);
      }
      
      return await validateUserAndRespond(userProfile, chatId, env);
    } else {
      await sendMessage(chatId, '❌ *Group membership not found*\n\nPlease make sure you:\n1️⃣ Joined our Telegram group\n2️⃣ Haven\'t left the group\n3️⃣ Try again in a few seconds', env, {
        inline_keyboard: [
          [{ text: '📢 Join Group', url: `https://t.me/c/${REQUIRED_GROUP_ID.replace('-100', '')}/1` }],
          [{ text: '🔄 Try Again', callback_data: 'verify_group' }]
        ]
      });
    }
  } catch (error) {
    console.error('[Bot] Error verifying group membership:', error);
    await sendMessage(chatId, '❌ *Verification Error*\n\nThere was an error checking your group membership. Please try again later.', env);
  }

  return new Response('OK', { status: 200 });
}

async function handleBalanceCommand(userId: number, chatId: number, env: any): Promise<Response> {
  const userProfile = await getUserProfile(userId, env);
  
  if (!userProfile) {
    await sendMessage(chatId, '❌ Profile not found. Please use /start to register.', env);
    return new Response('OK', { status: 200 });
  }

  const message = `💰 *Your Balance*

💵 Available: $${userProfile.balance.toFixed(2)}
📊 P&L: ${userProfile.balance >= 10 ? '+' : ''}$${(userProfile.balance - 10).toFixed(2)}

🎁 Initial Gift: $10.00
${userProfile.registrationCompleted ? '✅' : '⏳'} Registration Status: ${userProfile.registrationCompleted ? 'Complete' : 'Pending'}`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '🚀 Start Trading', web_app: { url: `${env.BASE_URL || env.MINIAPP_URL}/miniapp?user_id=${userId}&from_bot=1` } }],
      [{ text: '👤 Profile', callback_data: 'profile' }, { text: '💬 Support', callback_data: 'support' }]
    ]
  };

  await sendMessage(chatId, message, env, keyboard);
  return new Response('OK', { status: 200 });
}

async function handleProfileCommand(userId: number, chatId: number, env: any): Promise<Response> {
  const userProfile = await getUserProfile(userId, env);
  
  if (!userProfile) {
    await sendMessage(chatId, '❌ Profile not found. Please use /start to register.', env);
    return new Response('OK', { status: 200 });
  }

  const message = `👤 *Your Profile*

📛 Name: ${userProfile.firstName} ${userProfile.lastName || ''}
📧 Email: ${userProfile.email || 'Not set'}
👥 Username: ${userProfile.username ? '@' + userProfile.username : 'Not set'}
📅 Joined: ${new Date(userProfile.createdAt).toLocaleDateString()}
📢 Group Member: ${userProfile.isGroupMember ? '✅ Yes' : '❌ No'}
💰 Balance: $${userProfile.balance.toFixed(2)}`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '✏️ Edit Profile', callback_data: 'edit_profile' }],
      [{ text: '💰 Balance', callback_data: 'balance' }, { text: '💬 Support', callback_data: 'support' }]
    ]
  };

  await sendMessage(chatId, message, env, keyboard);
  return new Response('OK', { status: 200 });
}

async function showEditProfileMenu(userId: number, chatId: number, env: any): Promise<Response> {
  const message = `✏️ *Edit Profile*

What would you like to update?`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '📝 Change Name', callback_data: 'set_name' }],
      [{ text: '📧 Change Email', callback_data: 'set_email' }],
      [{ text: '🔄 Verify Group', callback_data: 'verify_group' }],
      [{ text: '← Back to Profile', callback_data: 'profile' }]
    ]
  };

  await sendMessage(chatId, message, env, keyboard);
  return new Response('OK', { status: 200 });
}

async function handleSupportCommand(userId: number, chatId: number, env: any): Promise<Response> {
  const message = `💬 *Customer Support*

Need help? Our support team is ready to assist you!

👨‍💼 **Contact Support**: ${SUPPORT_USERNAME}

**Common Questions:**
• How to deposit/withdraw funds
• Trading platform help  
• Account issues
• Technical support

Click the button below to contact our support team directly:`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '💬 Contact Support', url: `https://t.me/${SUPPORT_USERNAME.replace('@', '')}` }],
      [{ text: '💰 Balance', callback_data: 'balance' }, { text: '👤 Profile', callback_data: 'profile' }]
    ]
  };

  await sendMessage(chatId, message, env, keyboard);
  return new Response('OK', { status: 200 });
}

// Helper Functions
async function validateUserRequirements(userProfile: UserProfile, env: any): Promise<{
  allValid: boolean;
  hasName: boolean;
  hasEmail: boolean;
  isGroupMember: boolean;
}> {
  const hasName = !!(userProfile.firstName && userProfile.lastName);
  const hasEmail = !!(userProfile.email && userProfile.email.includes('@'));
  const isGroupMember = userProfile.isGroupMember;

  return {
    allValid: hasName && hasEmail && isGroupMember,
    hasName,
    hasEmail,
    isGroupMember
  };
}

async function sendMessage(chatId: number, text: string, env: any, replyMarkup?: any): Promise<void> {
  const payload: any = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    disable_web_page_preview: true
  };

  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN_SECRET}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!result.ok) {
      console.error('[Bot] Error sending message:', result);
    }
  } catch (error) {
    console.error('[Bot] Error sending message:', error);
  }
}

async function getUserProfile(userId: number, env: any): Promise<UserProfile | null> {
  try {
    const userData = await env.TRADING_KV.get(`user:${userId}`);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('[Bot] Error getting user profile:', error);
    return null;
  }
}

async function saveUserProfile(userProfile: UserProfile, env: any): Promise<void> {
  try {
    await env.TRADING_KV.put(`user:${userProfile.id}`, JSON.stringify(userProfile));
  } catch (error) {
    console.error('[Bot] Error saving user profile:', error);
  }
}

async function getUserState(userId: number, env: any): Promise<any> {
  try {
    const stateData = await env.TRADING_KV.get(`userstate:${userId}`);
    return stateData ? JSON.parse(stateData) : null;
  } catch (error) {
    console.error('[Bot] Error getting user state:', error);
    return null;
  }
}

async function setUserState(userId: number, state: any, env: any): Promise<void> {
  try {
    await env.TRADING_KV.put(`userstate:${userId}`, JSON.stringify(state), { expirationTtl: 3600 }); // 1 hour TTL
  } catch (error) {
    console.error('[Bot] Error setting user state:', error);
  }
}

async function clearUserState(userId: number, env: any): Promise<void> {
  try {
    await env.TRADING_KV.delete(`userstate:${userId}`);
  } catch (error) {
    console.error('[Bot] Error clearing user state:', error);
  }
}