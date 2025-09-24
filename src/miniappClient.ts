// Client-side Mini App script generator.
// Provides dynamic JavaScript for the Telegram WebApp, using server authoritative A  function executeTrade(action, crypto, followingAI, customAmount = null) {\n` +
`    const tradeId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);\n` +
`    const entryPrice = getCurrentPrice(crypto);\n` +
`    let isFollowingAI = followingAI;\n` +
`    let ticks = 0;\n` +
`    const maxTicks = 20;\n` +
`    let currentPnL = 0;\n` +
`    let tickValue = 0;\n` +
`    \n` +
`    // Use custom amount or default to $1000\n` +
`    const tradeAmount = customAmount || 1000;\n` +
`    \n` +
`    // Show trading popup\n` +
`    const popup = ce('div');\n` +
`    popup.id = 'trading-popup';\n` +
`    popup.innerHTML = \`\n` +
`      <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.8);z-index:1000;display:flex;align-items:center;justify-content:center">\n` +
`        <div style="background:white;padding:20px;border-radius:15px;width:90%;max-width:400px;text-align:center">\n` +
`          <h3 style="margin:0 0 15px">🚀 Trading \${action.toUpperCase()} \${crypto}</h3>\n` +
`          <div style="display:flex;justify-content:space-between;margin:10px 0">\n` +
`            <span>Entry: $\${entryPrice}</span>\n` +
`            <span id="current-price">Current: $\${entryPrice}</span>\n` +
`          </div>\n` +
`          <div style="margin:15px 0">\n` +
`            <div style="font-size:14px;color:#666;margin-bottom:5px">Trade Amount: $\${tradeAmount.toLocaleString()}</div>\n` +
`            <div id="pnl-display" style="font-size:24px;font-weight:bold;color:#333">P&L: $0.00</div>\n` +
`            <div id="percentage-display" style="font-size:16px;color:#666">0.00%</div>\n` +
`          </div>\n` +
`          <div style="margin:15px 0">\n` +
`            <div style="background:#f8f9fa;padding:10px;border-radius:8px">\n` +
`              <div>Tick: <span id="tick-counter">\${ticks}/\${maxTicks}</span></div>\n` +
`              <div style="margin-top:5px">Strategy: \${isFollowingAI ? '🤖 AI Signal' : '💼 Manual Trade'}</div>\n` +
`            </div>\n` +
`          </div>\n` +
`          <div id="close-button" style="display:none">\n` +
`            <button onclick="closeTrade()" style="background:#007bff;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer">Close Position</button>\n` +
`          </div>\n` +
`        </div>\n` +
`      </div>\n` +
`    \`;\n` +
`    \n` +
`    document.body.appendChild(popup);\n` +
`    \n` +
`    // Start tick simulation\n` +
`    const tickInterval = setInterval(() => {\n` +
`      ticks++;\n` +
`      \n` +
`      // Generate price movement\n` +
`      const baseVolatility = 0.002; // 0.2% base volatility\n` +
`      const aiBonus = isFollowingAI ? 0.0008 : -0.0005; // AI signals have slight positive bias\n` +
`      const randomMove = (Math.random() - 0.5) * baseVolatility * 2;\n` +
`      const directionMultiplier = action === 'BUY' ? 1 : -1;\n` +
`      \n` +
`      tickValue += (randomMove + aiBonus) * directionMultiplier;\n` +
`      const currentPrice = entryPrice * (1 + tickValue);\n` +
`      const pnlPercent = tickValue * 100;\n` +
`      currentPnL = tradeAmount * (pnlPercent / 100); // Use actual trade amount\n` +
`      \n` +
`      // Update UI\n` +
`      const tickEl = qs('tick-counter');\n` +
`      const priceEl = qs('current-price');\n` +
`      const pnlEl = qs('pnl-display');\n` +
`      const percEl = qs('percentage-display');\n` +
`      \n` +
`      if (tickEl) tickEl.textContent = \`\${ticks}/\${maxTicks}\`;\n` +
`      if (priceEl) priceEl.textContent = \`Current: $\${currentPrice.toFixed(2)}\`;\n` +
`      if (pnlEl) {\n` +
`        pnlEl.textContent = \`P&L: $\${currentPnL.toFixed(2)}\`;\n` +
`        pnlEl.style.color = currentPnL >= 0 ? '#28a745' : '#dc3545';\n` +
`      }\n` +
`      if (percEl) {\n` +
`        percEl.textContent = \`\${pnlPercent >= 0 ? '+' : ''}\${pnlPercent.toFixed(2)}%\`;\n` +
`        percEl.style.color = pnlPercent >= 0 ? '#28a745' : '#dc3545';\n` +
`      }\n` +
`      \n` +
`      // Show close button after 10 ticks\n` +
`      if (ticks >= 10) {\n` +
`        const closeBtn = qs('close-button');\n` +
`        if (closeBtn) closeBtn.style.display = 'block';\n` +
`      }\n` +
`      \n` +
`      // Auto-close at max ticks\n` +
`      if (ticks >= maxTicks) {\n` +
`        clearInterval(tickInterval);\n` +
`        finalizeTrade(tradeId, action, crypto, entryPrice, currentPrice, currentPnL, pnlPercent, ticks, isFollowingAI);\n` +
`      }\n` +
`    }, 500); // Tick every 500ms\n` +
`    \n` +
`    // Store interval ID for manual close\n` +
`    window.currentTradeInterval = tickInterval;\n` +
`    window.currentTradeData = {\n` +
`      tradeId, action, crypto, entryPrice, isFollowingAI, ticks, currentPnL, tickValue\n` +
`    };\n` +
`  }\n` +
`  \n` +
`  function closeTrade() {\n` +
`    if (window.currentTradeInterval) {\n` +
`      clearInterval(window.currentTradeInterval);\n` +
`      const data = window.currentTradeData;\n` +
`      const currentPrice = data.entryPrice * (1 + data.tickValue);\n` +
`      const pnlPercent = data.tickValue * 100;\n` +
`      finalizeTrade(data.tradeId, data.action, data.crypto, data.entryPrice, currentPrice, data.currentPnL, pnlPercent, data.ticks, data.isFollowingAI);\n` +
`    }\n` +
`  }\n` +
`  \n` +
`  // Make closeTrade globally available immediately\n` +
`  window.closeTrade = closeTrade;\n` +
`  \n` +
`  async function finalizeTrade(tradeId, action, crypto, entryPrice, exitPrice, pnl, pnlPercent, ticks, followedAI) {\n` +
`    // Remove popup\n` +
`    const popup = qs('trading-popup');\n` +
`    if (popup) popup.remove();\n` +
`    \n` +
`    // Execute trade via API if user is logged in\n` +
`    console.log('[MiniApp] Finalizing trade - userId:', window.__userId, 'PnL:', pnl);\n` +
`    \n` +
`    if (!window.__userId) {\n` +
`      console.log('[MiniApp] No userId - using demo mode (localStorage only)');\n` +
`      // Demo mode - update localStorage only\n` +
`      updateBalanceByAmount(pnl);\n` +
`      recordTransaction({\n` +
`        id: tradeId,\n` +
`        timestamp: new Date().toISOString(),\n` +
`        action,\n` +
`        crypto,\n` +
`        entryPrice,\n` +
`        exitPrice,\n` +
`        pnl,\n` +
`        followedAI\n` +
`      });\n` +
`      return;\n` +
`    }\n` +
`    \n` +
`    console.log('[MiniApp] User authenticated, sending to API');\n` +
`    if (window.__userId) {\n` +
`      try {\n` +
`        const amount = 100; // Use standard trade amount\n` +
`        const tradePayload = {\n` +
`          userId: window.__userId,\n` +
`          amount: amount,\n` +
`          symbol: crypto,\n` +
`          side: action.toUpperCase(),\n` +
`          pnl: pnl\n` +
`        };\n` +
`        console.log('[MiniApp] Sending trade request:', tradePayload);\n` +
`        \n` +
`        const res = await fetch(API_BASE + '/api/trade', {\n` +
`          method: 'POST',\n` +
`          headers: { 'Content-Type': 'application/json' },\n` +
`          body: JSON.stringify(tradePayload)\n` +
`        });\n` +
`        \n` +
`        console.log('[MiniApp] Trade API response status:', res.status);\n` +
`        const data = await res.json();\n` +
`        console.log('[MiniApp] Trade API response data:', data);\n` +
`        \n` +
`        if (data.success) {\n` +
`          console.log('[MiniApp] Trade successful, updating balance to:', data.data.newBalance);\n` +
`          // Update balance with server response\n` +
`          const balEl = qs('balance');\n` +
`          if (balEl) balEl.textContent = '$' + data.data.newBalance.toFixed(2);\n` +
`          \n` +
`          // Update displays\n` +
`          updateWalletBalance();\n` +
`          updatePortfolioStats();\n` +
`          await updateTransactionHistory();\n` +
`        } else {\n` +
`          console.error('[MiniApp] Trade API returned success: false:', data);\n` +
`          console.log('[MiniApp] Falling back to localStorage update');\n` +
`          // Fallback to localStorage update\n` +
`          updateBalanceByAmount(pnl);\n` +
`        }\n` +
`      } catch (error) {\n` +
`        console.error('[MiniApp] Trade API network error:', error);\n` +
`        console.log('[MiniApp] Falling back to localStorage update');\n` +
`        // Fallback to localStorage update\n` +
`        updateBalanceByAmount(pnl);\n` +
`      }\n` +
`    }\n` +
`    \n` +
`    // Record transaction for local display (for demo mode or backup)\n` +
`    // recordTransaction({\n` +
`      // id: tradeId,\n` +
`      // timestamp: new Date().toISOString(),\n` +
`      // action,\n` +
`      // crypto,\n` +
`      // entryPrice,\n` +
`      // exitPrice,\n` +
`      // pnl,\n` +
`      // pnlPercent,\n` +
`      // ticks,\n` +
`      // followedAI,\n` +
`      // strategy: followedAI ? 'AI Signal' : 'Manual'\n` +
`    // });\n` +
`    \n` +
`    // Show result message\n` +
`    const signalEl = qs('signal-' + currentSignal?.id);\n` +
`    if (signalEl) {\n` +
`      const resultColor = pnl >= 0 ? '#28a745' : '#dc3545';\n` +
`      const resultIcon = pnl >= 0 ? '🎉' : '😱';\n` +
`      const resultText = pnl >= 0 ? 'PROFIT' : 'LOSS';\n` +
`      \n` +
`      signalEl.innerHTML = \`\n` +
`        <div style="text-align:center;padding:20px;background:rgba(\${pnl >= 0 ? '40,167,69' : '220,53,69'},.2);border-radius:10px">\n` +
`          \${resultIcon} \${resultText} $\${pnl.toFixed(2)} (\${pnlPercent >= 0 ? '+' : ''}\${pnlPercent.toFixed(2)}%)\n` +
`          <div style="font-size:12px;margin-top:5px;opacity:0.8">\${ticks} ticks • \${followedAI ? 'Following AI' : 'Manual trade'}</div>\n` +
`        </div>\n` +
`      \`;\n` +
`    }\n` +
`    \n` +
`    setTimeout(scheduleNext, 3000);\n` +
`  }\n` +
`  \n` +
`  // Make finalizeTrade globally available for animated trades\n` +
`  window.finalizeTrade = finalizeTrade;\n` +
`  \n` +
`  function updateTransactionHistory() {\n` +
`    const historyEl = qs('transaction-history');\n` +
`    if (!historyEl) return;\n` +
`    \n` +
`    const transactions = JSON.parse(localStorage.transactions || '[]');\n` +
`    if (transactions.length === 0) {\n` +
`      historyEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📝</div><div>No transactions yet</div></div>';\n` +
`      return;\n` +
`    }\n` +
`    \n` +
`    historyEl.innerHTML = transactions.map(tx => {\n` +
`      const profitClass = tx.amount >= 0 ? 'profit' : 'loss';\n` +
`      let icon, description, displayAmount;\n` +
`      \n` +
`      switch(tx.type) {\n` +
`        case 'DEPOSIT':\n` +
`          icon = '💰';\n` +
`          description = 'Deposit';\n` +
`          displayAmount = '+$' + Math.abs(tx.amount).toFixed(2);\n` +
`          break;\n` +
`        case 'WITHDRAW':\n` +
`          icon = '💸';\n` +
`          description = 'Withdrawal';\n` +
`          displayAmount = '-$' + Math.abs(tx.amount).toFixed(2);\n` +
`          break;\n` +
`        case 'TRADE_PNL':\n` +
`          icon = tx.amount >= 0 ? '📈' : '📉';\n` +
`          description = 'Trade ' + (tx.meta?.side || '') + ' ' + (tx.meta?.symbol || '');\n` +
`          displayAmount = (tx.amount >= 0 ? '+' : '') + '$' + tx.amount.toFixed(2);\n` +
`          break;\n` +
`        case 'ADJUSTMENT':\n` +
`          icon = '🎁';\n` +
`          description = tx.meta?.description || 'Balance Adjustment';\n` +
`          displayAmount = (tx.amount >= 0 ? '+' : '') + '$' + tx.amount.toFixed(2);\n` +
`          break;\n` +
`        default:\n` +
`          icon = '💫';\n` +
`          description = 'Transaction';\n` +
`          displayAmount = (tx.amount >= 0 ? '+' : '') + '$' + tx.amount.toFixed(2);\n` +
`      }\n` +
`      \n` +
`      const date = new Date(tx.createdAt).toLocaleString();\n` +
`      return \`\n` +
`        <div class="transaction-item \${profitClass}">\n` +
`          <div class="transaction-header">\n` +
`            <div class="transaction-type">\n` +
`              <span class="transaction-icon">\${icon}</span>\n` +
`              <span class="transaction-action">\${description}</span>\n` +
`            </div>\n` +
`            <div class="transaction-amount">\${displayAmount}</div>\n` +
`          </div>\n` +
`          <div class="transaction-details">\n` +
`            <div class="transaction-date">\${date}</div>\n` +
`            \${tx.meta?.pnlPct ? '<div class="transaction-pnl ' + profitClass + '">(' + tx.meta.pnlPct.toFixed(1) + '%)</div>' : ''}\n` +
`          </div>\n` +
`        </div>\n` +
`      \`;\n` +
`    }).join('');\n` +
`  }\n` +
`  \n` +
`  function recordTransaction(transaction) {\n` +
`    if (!localStorage.transactions) {\n` +
`      localStorage.transactions = JSON.stringify([]);\n` +
`    }\n` +
`    const transactions = JSON.parse(localStorage.transactions);\n` +
`    transactions.unshift(transaction); // Add to beginning\n` +
`    \n` +
`    // Keep only last 50 transactions\n` +
`    if (transactions.length > 50) {\n` +
`      transactions.splice(50);\n` +
`    }\n` +
`    \n` +
`    localStorage.transactions = JSON.stringify(transactions);\n` +
`    updateTransactionHistory();\n` +
`  }\n` +
`  \n` +
`  function updateBalanceByAmount(amount) {\n` +
`    const current = parseFloat(localStorage.balance || '10000');\n` +
`    const newBalance = current + amount;\n` +
`    localStorage.balance = newBalance.toString();\n` +
`    const balanceEl = qs('balance');\n` +
`    if (balanceEl) {\n` +
`      balanceEl.textContent = '$' + newBalance.toFixed(2);\n` +
`      // Flash effect\n` +
`      balanceEl.style.background = amount >= 0 ? 'rgba(40,167,69,.3)' : 'rgba(220,53,69,.3)';\n` +
`      setTimeout(() => balanceEl.style.background = '', 1000);\n` +
`    }\n` +
`  }\n` +
`  \n` +
`  function getCurrentPrice(crypto) {\n` +
`    const prices = { BTC: 112000, ETH: 4170, XAU: 3780 };\n` +
`    return prices[crypto] + (Math.random() - 0.5) * 200; // Add some variance\n` +
`  }\n` +
`  \n` +
`  function executeManualTrade(action) {\n` +
`    const assetSelect = qs('manual-asset');\n` +
`    const amountInput = qs('trade-amount');\n` +
`    \n` +
`    if (!assetSelect || !amountInput) {\n` +
`      alert('Trading interface not found');\n` +
`      return;\n` +
`    }\n` +
`    \n` +
`    const asset = assetSelect.value;\n` +
`    const amount = parseFloat(amountInput.value);\n` +
`    \n` +
`    if (!amount || amount <= 0) {\n` +
`      alert('Please enter a valid amount');\n` +
`      return;\n` +
`    }\n` +
`    \n` +
`    const currentBalance = parseFloat(qs('balance')?.textContent?.replace('$', '') || '0');\n` +
`    \n` +
`    if (amount > currentBalance) {\n` +
`      alert('Insufficient balance for this trade');\n` +
`      return;\n` +
`    }\n` +
`    \n` +
`    // Execute the trade with manual flag\n` +
`    executeTrade(action, asset, false, amount);\n` +
`  }\n` +
`  \n` +
`})();\n`;

export function getMiniAppClientScript(baseUrl: string): string {
  return `// TradeX Pro MiniApp Client Script\n` +
`(function(){\n` +
`  const API_BASE = ${JSON.stringify(baseUrl)};\n` +
`  console.log('[MiniApp] API_BASE', API_BASE);\n` +
`  const startTs = Date.now();\n` +
`  function qs(id){return document.getElementById(id);}\n` +
`  function showDebug(msg){console.log('[MiniApp]', msg); const el = qs('userType'); if(el){el.textContent='🔧 '+msg; el.style.color='#FFA500';}}\n` +
`  function getUserFromTelegram(){\n` +
`    try {\n` +
`      const urlParams = new URLSearchParams(location.search);\n` +
`      const userId = urlParams.get('user_id');\n` +
`      const fromBot = urlParams.get('from_bot')==='1';\n` +
`      let tUser = null;\n` +
`      if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe){\n` +
`        tUser = window.Telegram.WebApp.initDataUnsafe.user;\n` +
`      }\n` +
`      if (tUser || userId){\n` +
`        return { id: tUser? tUser.id : userId, firstName: tUser? tUser.first_name : 'User', lastName: tUser? tUser.last_name : '', username: tUser? tUser.username : null, languageCode: tUser? tUser.language_code : 'en', fromBot };\n` +
`      }\n` +
`      return null;\n` +
`    } catch(e){console.error('getUserFromTelegram error', e); showDebug('User parse error'); return null;}\n` +
`  }\n` +
`  async function loadUserData(id){\n` +
`    try { const r = await fetch(API_BASE + '/api/user/' + id); if(!r.ok) return null; return await r.json(); } catch(e){ console.error(e); return null;}\n` +
`  }\n` +
`  \n` +
`  async function refreshBalance(userId) {\n` +
`    try {\n` +
`      const response = await fetch(API_BASE + '/api/user/' + userId + '/balance');\n` +
`      if (!response.ok) return null;\n` +
`      const data = await response.json();\n` +
`      if (data.success && typeof data.balance === 'number') {\n` +
`        const balEl = qs('balance');\n` +
`        if (balEl) balEl.textContent = '$' + data.balance.toFixed(2);\n` +
`        updateWalletBalance();\n` +
`        updatePortfolioStats();\n` +
`        return data.balance;\n` +
`      }\n` +
`    } catch (error) {\n` +
`      console.error('Balance refresh error:', error);\n` +
`    }\n` +
`    return null;\n` +
`  }\n` +
`  async function registerUser(u){\n` +
`    try { const r = await fetch(API_BASE + '/api/user/register',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id:u.id, firstName:u.firstName, lastName:u.lastName, username:u.username, languageCode:u.languageCode})}); if(!r.ok) throw new Error('register failed'); return await r.json(); } catch(e){ console.error(e); return null;}\n` +
`  }\n` +
`  function showTab(tab){\n` +
`    // Hide all tab sections\n` +
`    ['trade','portfolio','history'].forEach(t=>{ \n` +
`      const el=qs(t+'-tab'); \n` +
`      if(el) el.classList.remove('active');\n` +
`    });\n` +
`    \n` +
`    // Remove active class from all nav tabs\n` +
`    document.querySelectorAll('.nav-tab').forEach(btn=>btn.classList.remove('active'));\n` +
`    \n` +
`    // Show target tab\n` +
`    const active = qs(tab+'-tab'); \n` +
`    if(active) active.classList.add('active');\n` +
`    \n` +
`    // Activate correct nav button\n` +
`    document.querySelectorAll('.nav-tab').forEach(btn=>{ \n` +
`      if(btn.getAttribute('data-tab-switch')===tab) btn.classList.add('active');\n` +
`    });\n` +
`    \n` +
`    // Refresh data if needed\n` +
`    if(tab === 'history') {\n` +
`      updateTransactionHistory();\n` +
`    }\n` +
`  }\n` +
`  // Dynamic skeleton injection if missing expected structure\n` +
`  function ensureSkeleton(){\n` +
`    if(!qs('crypto-list')){\n` +
`      console.warn('[MiniApp] Injecting missing skeleton - crypto-list not found');\n` +
`      // Don't override the entire structure, just add missing elements\n` +
`      const priceSection = qs('crypto-list');\n` +
`      if(!priceSection) {\n` +
`        console.warn('[MiniApp] crypto-list element missing from HTML structure');\n` +
`      }\n` +
`    }\n` +
`    \n` +
`    // Ensure essential elements exist\n` +
`    if(!qs('ai-signals')){\n` +
`      console.warn('[MiniApp] ai-signals element missing');\n` +
`    }\n` +
`    if(!qs('balance')){\n` +
`      console.warn('[MiniApp] balance element missing');\n` +
`    }\n` +
`  }\n` +
`  function bindEvents(){\n` +
`    // Modern tab switching with animations\n` +
`    document.querySelectorAll('[data-tab-switch]').forEach(tab => {\n` +
`      tab.addEventListener('click', (e) => {\n` +
`        const targetTab = e.target.getAttribute('data-tab-switch');\n` +
`        \n` +
`        // Update active tab button\n` +
`        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));\n` +
`        e.target.classList.add('active');\n` +
`        \n` +
`        // Update active tab content\n` +
`        document.querySelectorAll('.tab-section').forEach(section => {\n` +
`          section.classList.remove('active');\n` +
`          if(section.id === targetTab + '-tab') {\n` +
`            section.classList.add('active');\n` +
`          }\n` +
`        });\n` +
`        \n` +
`        // Refresh data when tabs are opened\n` +
`        if(targetTab === 'history') {\n` +
`          updateTransactionHistory();\n` +
`        }\n` +
`        if(targetTab === 'portfolio') {\n` +
`          updatePortfolioStats();\n` +
`        }\n` +
`        if(targetTab === 'wallet') {\n` +
`          updateWalletBalance();\n` +
`          updateDepositHistory();\n` +
`          updateWithdrawHistory();\n` +
`          updateConfirmedDeposits();\n` +
`          updateConfirmedWithdrawals();\n` +
`        }\n` +
`      });\n` +
`    });\n` +
`    \n` +
`    // Manual trading buttons\n` +
`    const buyBtn = qs('manual-buy-btn');\n` +
`    const sellBtn = qs('manual-sell-btn');\n` +
`    \n` +
`    if(buyBtn) {\n` +
`      buyBtn.addEventListener('click', () => {\n` +
`        executeManualTrade('BUY');\n` +
`      });\n` +
`    }\n` +
`    \n` +
`    if(sellBtn) {\n` +
`      sellBtn.addEventListener('click', () => {\n` +
`        executeManualTrade('SELL');\n` +
`      });\n` +
`    }\n` +
`    \n` +
`    // Add hover effects to price items\n` +
`    document.addEventListener('click', (e) => {\n` +
`      if(e.target.closest('.price-item')) {\n` +
`        const priceItem = e.target.closest('.price-item');\n` +
`        const symbol = priceItem.getAttribute('data-sel');\n` +
`        if(symbol) {\n` +
`          // Add subtle click animation\n` +
`          priceItem.style.transform = 'scale(0.98)';\n` +
`          setTimeout(() => {\n` +
`            priceItem.style.transform = '';\n` +
`          }, 150);\n` +
`        }\n` +
`      }\n` +
`    });\n` +
`    \n` +
`    // Wallet functionality\n` +
`    const depositBtn = qs('deposit-confirm-btn');\n` +
`    const withdrawBtn = qs('withdraw-submit-btn');\n` +
`    \n` +
`    if(depositBtn) {\n` +
`      depositBtn.addEventListener('click', handleDeposit);\n` +
`    }\n` +
`    \n` +
`    if(withdrawBtn) {\n` +
`      withdrawBtn.addEventListener('click', handleWithdraw);\n` +
`    }\n` +
`    \n` +
`    // Copy wallet address on click\n` +
`    const walletAddress = qs('usdt-address');\n` +
`    if(walletAddress) {\n` +
`      walletAddress.addEventListener('click', () => {\n` +
`        navigator.clipboard.writeText(walletAddress.textContent).then(() => {\n` +
`          const originalText = walletAddress.textContent;\n` +
`          walletAddress.textContent = 'Copied!';\n` +
`          walletAddress.style.background = 'rgba(16, 185, 129, 0.2)';\n` +
`          setTimeout(() => {\n` +
`            walletAddress.textContent = originalText;\n` +
`            walletAddress.style.background = '';\n` +
`          }, 2000);\n` +
`        }).catch(() => {\n` +
`          alert('Failed to copy address');\n` +
`        });\n` +
`      });\n` +
`    }\n` +
`  }\n` +
`  window.showTab = showTab;\n` +
`  window.executeTrade = async function(side){\n` +
`    if(!window.__userId){alert('User unknown');return;}\n` +
`    const amtStr = prompt('Enter trade amount (USD)');\n` +
`    const amount = parseFloat(amtStr||''); if(!(amount>0)){return;}\n` +
`    const res = await fetch(API_BASE + '/api/trade',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({userId: window.__userId, amount, symbol:'BTC', side: side.toUpperCase() })});\n` +
`    const data = await res.json();\n` +
`    if(data.success){ \n` +
`      alert('Trade complete! PnL: '+data.data.trade.pnlUsd+' ( '+data.data.trade.pnlPct+'% )'); \n` +
`      const balEl = qs('balance'); \n` +
`      if(balEl) balEl.textContent='$'+data.data.newBalance.toFixed(2); \n` +
`    } else { \n` +
`      alert('Trade failed: '+data.error); \n` +
`    }\n` +
`  };\n` +
`  function genAISignal(currentPrices) {\n` +
`    console.log('[MiniApp] Generating AI signal with prices:', currentPrices);\n` +
`    \n` +
`    // Check if we have price data\n` +
`    if (!currentPrices || Object.keys(currentPrices).length === 0) {\n` +
`      console.warn('[MiniApp] No price data available for AI signals');\n` +
`      return null;\n` +
`    }\n` +
`    \n` +
`    const cryptos = ['BTC', 'ETH', 'XAU'];\n` +
`    const availableCryptos = cryptos.filter(c => currentPrices[c]);\n` +
`    \n` +
`    if (availableCryptos.length === 0) {\n` +
`      console.warn('[MiniApp] No available crypto prices for signals');\n` +
`      return null;\n` +
`    }\n` +
`    \n` +
`    const selectedCrypto = availableCryptos[Math.floor(Math.random() * availableCryptos.length)];\n` +
`    const action = Math.random() > 0.5 ? 'BUY' : 'SELL';\n` +
`    const confidence = Math.floor(75 + Math.random() * 20); // 75-95% confidence\n` +
`    \n` +
`    const technicalReasons = {\n` +
`      BUY: [\n` +
`        'RSI oversold at 28, bullish divergence forming',\n` +
`        'Breaking above 50-day moving average with volume',\n` +
`        'Golden cross: 50 MA crossing above 200 MA',\n` +
`        'Support level holding strong, bounce expected',\n` +
`        'Bullish flag pattern confirmed, target +5%',\n` +
`        'MACD histogram turning positive, momentum shift',\n` +
`        'Volume surge +340%, institutional buying detected',\n` +
`        'Fibonacci retracement 61.8% support holding'\n` +
`      ],\n` +
`      SELL: [\n` +
`        'RSI overbought at 78, bearish divergence forming',\n` +
`        'Breaking below key support with high volume',\n` +
`        'Death cross: 50 MA crossing below 200 MA',\n` +
`        'Resistance rejection at critical level',\n` +
`        'Head and shoulders pattern, target -4%',\n` +
`        'MACD bearish crossover confirmed',\n` +
`        'Distribution phase detected, smart money exit',\n` +
`        'Rising wedge breakdown, momentum weakening'\n` +
`      ]\n` +
`    };\n` +
`    \n` +
`    const reasons = technicalReasons[action];\n` +
`    const selectedReason = reasons[Math.floor(Math.random() * reasons.length)];\n` +
`    \n` +
`    const signal = {\n` +
`      id: Date.now(),\n` +
`      crypto: selectedCrypto,\n` +
`      action,\n` +
`      reason: selectedReason,\n` +
`      price: currentPrices[selectedCrypto],\n` +
`      confidence,\n` +
`      timestamp: Date.now()\n` +
`    };\n` +
`    \n` +
`    console.log('[MiniApp] Generated AI signal:', signal);\n` +
`    return signal;\n` +
`  }\n` +
`  function displaySignal(sig) {\n` +
`    console.log('[MiniApp] Displaying signal:', sig);\n` +
`    \n` +
`    const wrap = qs('ai-signals');\n` +
`    if (!wrap) {\n` +
`      console.warn('[MiniApp] AI signals container not found');\n` +
`      return;\n` +
`    }\n` +
`    \n` +
`    // Handle null signals\n` +
`    if (!sig) {\n` +
`      wrap.innerHTML = \`\n` +
`        <div class="empty-state">\n` +
`          <div class="empty-state-icon">🔍</div>\n` +
`          <div>AI is analyzing market conditions...</div>\n` +
`          <div style="font-size:12px;color:#666;margin-top:8px">Waiting for market data</div>\n` +
`        </div>\n` +
`      \`;\n` +
`      // Retry after 3 seconds\n` +
`      setTimeout(() => {\n` +
`        const newSig = genAISignal(window.__prices || {});\n` +
`        displaySignal(newSig);\n` +
`      }, 3000);\n` +
`      return;\n` +
`    }\n` +
`    \n` +
`    window.__currentSignal = sig;\n` +
`    window.__signalStartTime = Date.now();\n` +
`    const timeoutMs = 5000 + Math.random() * 10000;\n` +
`    \n` +
`    wrap.innerHTML = \`\n` +
`      <div class="signal-card" id="signal-\${sig.id}">\n` +
`        <div class="signal-header">\n` +
`          <div class="signal-icon">\${sig.action === 'BUY' ? '🚀' : '📉'}</div>\n` +
`          <div>\n` +
`            <div style="font-size:18px;font-weight:700;color:#1e293b;margin-bottom:4px">\n` +
`              \${sig.action} \${sig.crypto}\n` +
`            </div>\n` +
`            <div style="font-size:14px;color:#64748b">AI Confidence: \${sig.confidence}%</div>\n` +
`          </div>\n` +
`        </div>\n` +
`        \n` +
`        <div style="background:rgba(255,255,255,0.3);border-radius:12px;padding:15px;margin:15px 0">\n` +
`          <div style="font-size:14px;font-weight:600;margin-bottom:8px;color:#1e293b">📈 Technical Analysis</div>\n` +
`          <div style="font-size:13px;line-height:1.5;color:#374151">\${sig.reason}</div>\n` +
`        </div>\n` +
`        \n` +
`        <div style="display:flex;align-items:center;justify-content:space-between;margin:15px 0">\n` +
`          <div style="font-size:16px;font-weight:600;color:#1e293b">Current: $\${sig.price.toLocaleString()}</div>\n` +
`          <div class="countdown-timer" id="timer-\${sig.id}">⏱️ \${Math.ceil(timeoutMs/1000)}s</div>\n` +
`        </div>\n` +
`        \n` +
`        <div class="action-buttons">\n` +
`          <button class="btn btn-follow" data-follow="\${sig.id}">✅ Follow AI</button>\n` +
`          <button class="btn btn-ignore" data-ignore="\${sig.id}">❌ Ignore</button>\n` +
`        </div>\n` +
`      </div>\n` +
`    \`;\n` +
`    \n` +
`    wrap.querySelector('[data-follow]')?.addEventListener('click',()=>followSignal(sig));\n` +
`    wrap.querySelector('[data-ignore]')?.addEventListener('click',()=>ignoreSignal(sig));\n` +
`    \n` +
`    const timer = setInterval(()=>{\n` +
`      const elapsed = Date.now() - window.__signalStartTime;\n` +
`      const remaining = Math.max(0, Math.ceil((timeoutMs - elapsed)/1000));\n` +
`      const timerEl = qs('timer-'+sig.id);\n` +
`      if(timerEl) {\n` +
`        timerEl.textContent = '⏱️ ' + remaining + 's';\n` +
`        if(remaining <= 5) {\n` +
`          timerEl.style.background = 'rgba(239, 68, 68, 0.2)';\n` +
`          timerEl.style.color = '#dc2626';\n` +
`        }\n` +
`      }\n` +
`      if(remaining <= 0){\n` +
`        clearInterval(timer);\n` +
`        autoExpireSignal(sig);\n` +
`      }\n` +
`    }, 1000);\n` +
`  }\n` +
`  function followSignal(sig) {\n` +
`    const balEl = qs('balance');\n` +
`    const currentBalance = parseFloat(balEl?.textContent?.replace('$', '').replace(',', '') || '0');\n` +
`    const amount = Math.min(1000, currentBalance * 1); // Use 10% of balance or $1000, whichever is smaller\n` +
`    \n` +
`    console.log('[MiniApp] Following AI signal:', sig);\n` +
`    executeTradeWithCountdown(sig.action, sig.crypto, amount, true, 'following');\n` +
`  }\n` +
`  function ignoreSignal(sig){ \n` +
`    const el=qs('signal-'+sig.id); \n` +
`    if(!el) return; \n` +
`    el.innerHTML='<div style="text-align:center;padding:20px">⏭️ Signal Ignored</div>'; \n` +
`    scheduleNext(); \n` +
`  }\n` +
`  function autoExpireSignal(sig){\n` +
`    const el=qs('signal-'+sig.id); \n` +
`    if(!el) return; \n` +
`    el.innerHTML='<div style="text-align:center;padding:15px;background:rgba(255,152,0,.2);border-radius:8px">⏰ Signal Expired - Analyzing...</div>';\n` +
`    setTimeout(()=>{\n` +
`      el.innerHTML='<div style="text-align:center;padding:15px;opacity:.7">� Finding new opportunity...</div>';\n` +
`      setTimeout(scheduleNext, 2000 + Math.random() * 3000);\n` +
`    }, 2000);\n` +
`  }\n` +
`  function updateBalanceByPercent(p){ \n` +
`    const balEl=qs('balance'); \n` +
`    if(!balEl) return; \n` +
`    const cur=parseFloat(balEl.textContent.replace('$',''))||0; \n` +
`    const nb=cur+(cur*p/100); \n` +
`    balEl.textContent='$'+nb.toFixed(2); \n` +
`    // Add visual feedback\n` +
`    balEl.style.transition = 'all 0.3s ease';\n` +
`    balEl.style.background = p >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';\n` +
`    setTimeout(() => balEl.style.background = '', 1000);\n` +
`  }\n` +
`  function scheduleNext() {\n` +
`    setTimeout(() => {\n` +
`      console.log('[MiniApp] Scheduling next signal with prices:', window.__prices);\n` +
`      const sig = genAISignal(window.__prices || {});\n` +
`      displaySignal(sig);\n` +
`    }, 5000);\n` +
`  }\n` +
`  \n` +
`  async function loadPrices() {\n` +
`    try {\n` +
`      console.log('[MiniApp] Loading prices from:', API_BASE + '/api/prices');\n` +
`      const response = await fetch(API_BASE + '/api/prices');\n` +
`      \n` +
`      if (!response.ok) {\n` +
`        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);\n` +
`      }\n` +
`      \n` +
`      const prices = await response.json();\n` +
`      console.log('[MiniApp] Loaded prices:', prices);\n` +
`      \n` +
`      window.__prices = {};\n` +
`      const list = qs('crypto-list');\n` +
`      \n` +
`      if (list) {\n` +
`        list.innerHTML = prices.map(crypto => {\n` +
`          window.__prices[crypto.symbol] = crypto.price;\n` +
`          const changeClass = crypto.change >= 0 ? 'positive' : 'negative';\n` +
`          const changeSymbol = crypto.change >= 0 ? '+' : '';\n` +
`          \n` +
`          return \`\n` +
`            <div class="price-item" data-sel="\${crypto.symbol}">\n` +
`              <div class="crypto-info">\n` +
`                <h3>\${crypto.name}</h3>\n` +
`                <div class="crypto-symbol">\${crypto.symbol}</div>\n` +
`              </div>\n` +
`              <div class="price-value">\n` +
`                <div class="price-amount">$\${crypto.price.toLocaleString()}</div>\n` +
`                <div class="price-change \${changeClass}">\n` +
`                  \${changeSymbol}\${crypto.change.toFixed(2)}%\n` +
`                </div>\n` +
`              </div>\n` +
`            </div>\n` +
`          \`;\n` +
`        }).join('');\n` +
`        \n` +
`        // Start AI signals after prices load\n` +
`        setTimeout(() => {\n` +
`          console.log('[MiniApp] Starting AI signals with prices:', window.__prices);\n` +
`          displaySignal(genAISignal(window.__prices));\n` +
`        }, 1500);\n` +
`      }\n` +
`    } catch (error) {\n` +
`      console.error('[MiniApp] Failed to load prices:', error);\n` +
`      const list = qs('crypto-list');\n` +
`      if (list) {\n` +
`        list.innerHTML = \`\n` +
`          <div class="empty-state">\n` +
`            <div class="empty-state-icon">⚠️</div>\n` +
`            <div>Failed to load market data</div>\n` +
`            <div style="font-size:12px;color:#666;margin-top:8px">Error: \${error.message}</div>\n` +
`          </div>\n` +
`        \`;\n` +
`      }\n` +
`    }\n` +
`  }\n` +
`  \n` +
`  // Trade finalization function for API persistence\n` +
`  async function finalizeTrade(tradeId, action, crypto, entryPrice, exitPrice, pnl, pnlPercent, ticks, followedAI) {\n` +
`    console.log('[MiniApp] Finalizing trade - userId:', window.__userId, 'PnL:', pnl);\n` +
`    \n` +
`    if (!window.__userId) {\n` +
`      console.log('[MiniApp] No userId - using demo mode (localStorage only)');\n` +
`      return;\n` +
`    }\n` +
`    \n` +
`    console.log('[MiniApp] User authenticated, sending to API');\n` +
`    try {\n` +
`      const amount = 100; // Use standard trade amount\n` +
`      const tradePayload = {\n` +
`        userId: window.__userId,\n` +
`        amount: amount,\n` +
`        symbol: crypto,\n` +
`        side: action.toUpperCase(),\n` +
`        pnl: pnl\n` +
`      };\n` +
`      console.log('[MiniApp] Sending trade request:', tradePayload);\n` +
`      \n` +
`      const res = await fetch(API_BASE + '/api/trade', {\n` +
`        method: 'POST',\n` +
`        headers: { 'Content-Type': 'application/json' },\n` +
`        body: JSON.stringify(tradePayload)\n` +
`      });\n` +
`      \n` +
`      console.log('[MiniApp] Trade API response status:', res.status);\n` +
`      const data = await res.json();\n` +
`      console.log('[MiniApp] Trade API response data:', data);\n` +
`      \n` +
`      if (data.success) {\n` +
`        console.log('[MiniApp] Trade successful, updating balance to:', data.data.newBalance);\n` +
`        // Update balance with server response\n` +
`        const balEl = qs('balance');\n` +
`        if (balEl) balEl.textContent = '$' + data.data.newBalance.toFixed(2);\n` +
`        \n` +
`        // Update displays\n` +
`        updateWalletBalance();\n` +
`        updatePortfolioStats();\n` +
`        await updateTransactionHistory();\n` +
`      } else {\n` +
`        console.error('[MiniApp] Trade API returned success: false:', data);\n` +
`        console.log('[MiniApp] Trade not persisted to server');\n` +
`      }\n` +
`    } catch (error) {\n` +
`      console.error('[MiniApp] Trade API network error:', error);\n` +
`      console.log('[MiniApp] Trade not persisted to server');\n` +
`    }\n` +
`  }\n` +
`  \n` +
`  async function init(){ \n` +
`    showDebug('Initializing'); \n` +
`    ensureSkeleton(); \n` +
`    bindEvents(); \n` +
`    \n` +
`    const user = getUserFromTelegram(); \n` +
`    const balEl = qs('balance'); \n` +
`    const greetingEl = qs('user-greeting'); \n` +
`    \n` +
`    if(user){ \n` +
`      window.__userId = user.id; \n` +
`      const userName = user.firstName || user.username || 'Trader'; \n` +
`      if(greetingEl) greetingEl.textContent = \`Hello, \${userName}! 👋\`; \n` +
`      \n` +
`      const existing = await loadUserData(user.id); \n` +
`      \n` +
`      if(existing && existing.success){ \n` +
`        const u = existing.data; \n` +
`        if(balEl) balEl.textContent = '$' + (u.balance || 10000).toFixed(2); \n` +
`        showDebug('User loaded: ' + u.firstName); \n` +
`        \n` +
`        // Refresh balance from server to ensure accuracy\n` +
`        await refreshBalance(user.id);\n` +
`      } else { \n` +
`        const reg = await registerUser(user); \n` +
`        if(reg && reg.success){ \n` +
`          if(balEl) balEl.textContent = '$' + (reg.data.balance || 10000).toFixed(2); \n` +
`          showDebug('User registered: ' + user.firstName); \n` +
`          \n` +
`          // Refresh balance from server\n` +
`          await refreshBalance(user.id);\n` +
`        } else { \n` +
`          showDebug('Registration failed'); \n` +
`        } \n` +
`      } \n` +
`    } else { \n` +
`      showDebug('Demo mode - no Telegram user data'); \n` +
`      if(greetingEl) greetingEl.textContent = 'Hello, Demo User! 👋'; \n` +
`      if(balEl) balEl.textContent = '$10,000.00'; \n` +
`    } \n` +
`    \n` +
`    loadPrices(); \n` +
`    updateTransactionHistory(); \n` +
`    updatePortfolioStats(); \n` +
`    updateWalletBalance(); \n` +
`    updateDepositHistory(); \n` +
`    updateWithdrawHistory();\n` +
`    updateConfirmedDeposits();\n` +
`    updateConfirmedWithdrawals(); \n` +
`    window.__miniAppReady = true; \n` +
`  }\n` +
`  \n` +
`  // Transaction History Management\n` +
`  async function updateTransactionHistory() {\n` +
`    try {\n` +
`      const historyContainer = qs('transaction-history');\n` +
`      if (!historyContainer) {\n` +
`        console.warn('[MiniApp] Transaction history container not found');\n` +
`        return;\n` +
`      }\n` +
`      \n` +
`      if (!window.__userId) {\n` +
`        // Fallback to localStorage for demo mode\n` +
`        const transactions = JSON.parse(localStorage.getItem('tradeHistory') || '[]');\n` +
`        displayLocalTransactionHistory(historyContainer, transactions);\n` +
`        return;\n` +
`      }\n` +
`      \n` +
`      // Fetch transactions from server\n` +
`      try {\n` +
`        console.log('[MiniApp] Fetching transactions for userId:', window.__userId);\n` +
`        const response = await fetch(API_BASE + '/api/user/' + window.__userId + '/transactions');\n` +
`        console.log('[MiniApp] Transaction API response status:', response.status);\n` +
`        if (!response.ok) throw new Error('Failed to fetch transactions');\n` +
`        \n` +
`        const data = await response.json();\n` +
`        console.log('[MiniApp] Transaction API response data:', data);\n` +
`        if (data.success && data.data && data.data.transactions) {\n` +
`          displayServerTransactionHistory(historyContainer, data.data.transactions);\n` +
`        } else {\n` +
`          console.error('[MiniApp] Transaction API failed:', data);\n` +
`          throw new Error(data.error || 'Unknown error');\n` +
`        }\n` +
`      } catch (error) {\n` +
`        console.error('[MiniApp] Error fetching transactions from server:', error);\n` +
`        // Fallback to localStorage\n` +
`        const transactions = JSON.parse(localStorage.getItem('tradeHistory') || '[]');\n` +
`        displayLocalTransactionHistory(historyContainer, transactions);\n` +
`      }\n` +
`    } catch (error) {\n` +
`      console.error('[MiniApp] Error updating transaction history:', error);\n` +
`    }\n` +
`  }\n` +
`  \n` +
`  function displayLocalTransactionHistory(container, transactions) {\n` +
`    if (transactions.length === 0) {\n` +
`      container.innerHTML = \`\n` +
`        <div class="empty-state">\n` +
`          <div class="empty-state-icon">📊</div>\n` +
`          <div>No trading history yet</div>\n` +
`          <div style="font-size:14px;color:#64748b;margin-top:8px">Your completed trades will appear here</div>\n` +
`        </div>\n` +
`      \`;\n` +
`      return;\n` +
`    }\n` +
`    \n` +
`    const recentTransactions = transactions.slice(-10).reverse();\n` +
`    container.innerHTML = recentTransactions.map(tx => {\n` +
`      const profitClass = tx.pnl >= 0 ? 'profit' : 'loss';\n` +
`      const profitIcon = tx.pnl >= 0 ? '📈' : '📉';\n` +
`      const date = new Date(tx.timestamp).toLocaleString();\n` +
`      return \`\n` +
`        <div class="transaction-item \${profitClass}">\n` +
`          <div class="transaction-header">\n` +
`            <div class="transaction-type">\n` +
`              <span class="transaction-icon">\${profitIcon}</span>\n` +
`              <span class="transaction-action">\${tx.action} \${tx.asset}</span>\n` +
`            </div>\n` +
`            <div class="transaction-amount">$\${Math.abs(tx.amount).toLocaleString()}</div>\n` +
`          </div>\n` +
`          <div class="transaction-details">\n` +
`            <div class="transaction-date">\${date}</div>\n` +
`            <div class="transaction-pnl \${profitClass}">\n` +
`              \${tx.pnl >= 0 ? '+' : ''}$\${tx.pnl.toFixed(2)} (\${tx.pnlPct.toFixed(1)}%)\n` +
`            </div>\n` +
`          </div>\n` +
`        </div>\n` +
`      \`;\n` +
`    }).join('');\n` +
`  }\n` +
`  \n` +
`  function displayServerTransactionHistory(container, transactions) {\n` +
`    if (!transactions || transactions.length === 0) {\n` +
`      container.innerHTML = \`\n` +
`        <div class="empty-state">\n` +
`          <div class="empty-state-icon">💰</div>\n` +
`          <div>No transactions yet</div>\n` +
`          <div style="font-size:14px;color:#64748b;margin-top:8px">All your transactions will appear here</div>\n` +
`        </div>\n` +
`      \`;\n` +
`      return;\n` +
`    }\n` +
`    \n` +
`    // Apply filters and sorting\n` +
`    const filteredTransactions = filterAndSortAllTransactions(transactions, 'transaction-type-filter', 'transaction-sort');\n` +
`    \n` +
`    if (filteredTransactions.length === 0) {\n` +
`      container.innerHTML = \`\n` +
`        <div class="empty-state">\n` +
`          <div class="empty-state-icon">🔍</div>\n` +
`          <div>No transactions match your filters</div>\n` +
`          <div style="font-size:14px;color:#64748b;margin-top:8px">Try adjusting your filters</div>\n` +
`        </div>\n` +
`      \`;\n` +
`      return;\n` +
`    }\n` +
`    \n` +
`    container.innerHTML = filteredTransactions.map(tx => {\n` +
`      const profitClass = tx.amount >= 0 ? 'profit' : 'loss';\n` +
`      let icon, description, displayAmount;\n` +
`      \n` +
`      switch(tx.type) {\n` +
`        case 'DEPOSIT':\n` +
`          icon = '💰';\n` +
`          description = 'Deposit';\n` +
`          displayAmount = '+$' + Math.abs(tx.amount).toFixed(2);\n` +
`          break;\n` +
`        case 'WITHDRAW':\n` +
`          icon = '💸';\n` +
`          description = 'Withdrawal';\n` +
`          displayAmount = '-$' + Math.abs(tx.amount).toFixed(2);\n` +
`          break;\n` +
`        case 'TRADE_PNL':\n` +
`          icon = tx.amount >= 0 ? '📈' : '📉';\n` +
`          description = 'Trade ' + (tx.meta?.side || '') + ' ' + (tx.meta?.symbol || '');\n` +
`          displayAmount = (tx.amount >= 0 ? '+' : '') + '$' + tx.amount.toFixed(2);\n` +
`          break;\n` +
`        case 'ADJUSTMENT':\n` +
`          icon = '🎁';\n` +
`          description = tx.meta?.description || 'Balance Adjustment';\n` +
`          displayAmount = (tx.amount >= 0 ? '+' : '') + '$' + tx.amount.toFixed(2);\n` +
`          break;\n` +
`        default:\n` +
`          icon = '💫';\n` +
`          description = 'Transaction';\n` +
`          displayAmount = (tx.amount >= 0 ? '+' : '') + '$' + tx.amount.toFixed(2);\n` +
`      }\n` +
`      \n` +
`      const date = new Date(tx.createdAt).toLocaleString();\n` +
`      return \`\n` +
`        <div class="transaction-item \${profitClass}">\n` +
`          <div class="transaction-header">\n` +
`            <div class="transaction-type">\n` +
`              <span class="transaction-icon">\${icon}</span>\n` +
`              <span class="transaction-action">\${description}</span>\n` +
`            </div>\n` +
`            <div class="transaction-amount">\${displayAmount}</div>\n` +
`          </div>\n` +
`          <div class="transaction-details">\n` +
`            <div class="transaction-date">\${date}</div>\n` +
`            \${tx.meta?.pnlPct ? '<div class="transaction-pnl ' + profitClass + '">(' + tx.meta.pnlPct.toFixed(1) + '%)</div>' : ''}\n` +
`          </div>\n` +
`        </div>\n` +
`      \`;\n` +
`    }).join('');\n` +
`    \n` +
`    // Setup filter event listeners\n` +
`    setupFilterListeners();\n` +
`  }\n` +
`  \n` +
`  // Portfolio Statistics Update\n` +
`  async function updatePortfolioStats() {\n` +
`    try {\n` +
`      // Get real transaction data from server if user is logged in\n` +
`      let serverTransactions = [];\n` +
`      let serverDeposits = [];\n` +
`      let serverWithdrawals = [];\n` +
`      \n` +
`      if (window.__userId) {\n` +
`        try {\n` +
`          const response = await fetch(\`\${API_BASE}/api/user/\${window.__userId}/transactions\`);\n` +
`          const data = await response.json();\n` +
`          if (data.success && data.data.transactions) {\n` +
`            serverTransactions = data.data.transactions;\n` +
`            \n` +
`            // Separate by transaction type\n` +
`            serverDeposits = serverTransactions.filter(tx => tx.type === 'DEPOSIT' && (tx.status === 'APPROVED' || tx.meta?.status === 'approved'));\n` +
`            serverWithdrawals = serverTransactions.filter(tx => tx.type === 'WITHDRAW' && (tx.status === 'COMPLETED' || tx.status === 'PROCESSING'));\n` +
`          }\n` +
`        } catch (error) {\n` +
`          console.error('[MiniApp] Failed to load server transactions:', error);\n` +
`        }\n` +
`      }\n` +
`      \n` +
`      // Get local trading history for trade statistics\n` +
`      const localTrades = JSON.parse(localStorage.getItem('tradeHistory') || '[]');\n` +
`      const serverTradePnL = serverTransactions.filter(tx => tx.type === 'TRADE_PNL');\n` +
`      \n` +
`      // Use server trades if available, fallback to localStorage\n` +
`      const trades = serverTradePnL.length > 0 ? serverTradePnL : localTrades;\n` +
`      const currentBalance = parseFloat(qs('balance')?.textContent?.replace('$', '').replace(',', '') || '0');\n` +
`      \n` +
`      // Calculate financial breakdown\n` +
`      const totalDeposits = serverDeposits.reduce((sum, tx) => sum + tx.amount, 0);\n` +
`      const totalWithdrawals = Math.abs(serverWithdrawals.reduce((sum, tx) => sum + tx.amount, 0));\n` +
`      const giftBonus = 10; // Welcome gift bonus\n` +
`      \n` +
`      // Calculate trading statistics\n` +
`      const totalTrades = trades.length;\n` +
`      const wins = trades.filter(t => (t.pnl || t.amount || 0) > 0);\n` +
`      const losses = trades.filter(t => (t.pnl || t.amount || 0) < 0);\n` +
`      \n` +
`      const totalProfit = wins.reduce((sum, t) => sum + (t.pnl || t.amount || 0), 0);\n` +
`      const totalLoss = Math.abs(losses.reduce((sum, t) => sum + (t.pnl || t.amount || 0), 0));\n` +
`      const totalTradePnL = totalProfit - totalLoss;\n` +
`      \n` +
`      const winRate = totalTrades > 0 ? (wins.length / totalTrades * 100) : 0;\n` +
`      const avgWin = wins.length > 0 ? totalProfit / wins.length : 0;\n` +
`      const avgLoss = losses.length > 0 ? totalLoss / losses.length : 0;\n` +
`      \n` +
`      const bestWin = wins.length > 0 ? Math.max(...wins.map(t => t.pnl || t.amount || 0)) : 0;\n` +
`      const worstLoss = losses.length > 0 ? Math.abs(Math.min(...losses.map(t => t.pnl || t.amount || 0))) : 0;\n` +
`      \n` +
`      // Calculate available trading balance (current balance - pending withdrawals)\n` +
`      const tradingBalance = currentBalance;\n` +
`      \n` +
`      // Update DOM elements\n` +
`      const updateEl = (id, value) => {\n` +
`        const el = qs(id);\n` +
`        if (el) el.textContent = value;\n` +
`      };\n` +
`      \n` +
`      // Enhanced Account Summary\n` +
`      updateEl('portfolio-balance', '$' + currentBalance.toFixed(2));\n` +
`      updateEl('portfolio-trading-balance', '$' + tradingBalance.toFixed(2));\n` +
`      updateEl('portfolio-deposit', '$' + totalDeposits.toFixed(2));\n` +
`      updateEl('portfolio-withdraw', '$' + totalWithdrawals.toFixed(2));\n` +
`      updateEl('portfolio-gift', '$' + giftBonus.toFixed(2));\n` +
`      updateEl('portfolio-total-pnl', (totalTradePnL >= 0 ? '+$' : '-$') + Math.abs(totalTradePnL).toFixed(2));\n` +
`      \n` +
`      // Set color for trading P&L\n` +
`      const pnlEl = qs('portfolio-total-pnl');\n` +
`      if (pnlEl) {\n` +
`        pnlEl.style.color = totalTradePnL >= 0 ? '#10b981' : '#ef4444';\n` +
`        pnlEl.className = totalTradePnL >= 0 ? 'stat-value profit' : 'stat-value loss';\n` +
`      }\n` +
`      \n` +
`      // Set colors for deposit/withdrawal amounts\n` +
`      const depositEl = qs('portfolio-deposit');\n` +
`      if (depositEl) {\n` +
`        depositEl.style.color = totalDeposits > 0 ? '#10b981' : '#64748b';\n` +
`      }\n` +
`      \n` +
`      const withdrawEl = qs('portfolio-withdraw');\n` +
`      if (withdrawEl) {\n` +
`        withdrawEl.style.color = totalWithdrawals > 0 ? '#dc2626' : '#64748b';\n` +
`      }\n` +
`      \n` +
`      // Trading Statistics\n` +
`      updateEl('portfolio-total-trades', totalTrades.toString());\n` +
`      updateEl('portfolio-win-rate', winRate.toFixed(1) + '%');\n` +
`      \n` +
`      // Wins Section\n` +
`      updateEl('portfolio-wins-count', wins.length.toString());\n` +
`      updateEl('portfolio-wins-amount', '+$' + totalProfit.toFixed(2));\n` +
`      updateEl('portfolio-avg-win', '+$' + avgWin.toFixed(2));\n` +
`      updateEl('portfolio-best-win', '+$' + bestWin.toFixed(2));\n` +
`      \n` +
`      // Losses Section\n` +
`      updateEl('portfolio-losses-count', losses.length.toString());\n` +
`      updateEl('portfolio-losses-amount', '-$' + totalLoss.toFixed(2));\n` +
`      updateEl('portfolio-avg-loss', '-$' + avgLoss.toFixed(2));\n` +
`      updateEl('portfolio-worst-loss', '-$' + worstLoss.toFixed(2));\n` +
`      \n` +
`      console.log('[MiniApp] Portfolio stats updated:', {\n` +
`        totalTrades,\n` +
`        wins: wins.length,\n` +
`        losses: losses.length,\n` +
`        winRate: winRate.toFixed(1) + '%',\n` +
`        totalPnL: totalTradePnL.toFixed(2)\n` +
`      });\n` +
`      \n` +
`    } catch (error) {\n` +
`      console.error('[MiniApp] Error updating portfolio stats:', error);\n` +
`    }\n` +
`  }\n` +
`  \n` +
`  // Wallet Functions\n` +
`  function updateWalletBalance() {\n` +
`    const balanceEl = qs('balance');\n` +
`    const walletBalanceEl = qs('wallet-balance');\n` +
`    \n` +
`    if (balanceEl && walletBalanceEl) {\n` +
`      walletBalanceEl.textContent = balanceEl.textContent;\n` +
`    }\n` +
`  }\n` +
`  \n` +
`  async function handleDeposit() {\n` +
`    const amountInput = qs('deposit-amount');\n` +
`    \n` +
`    if (!amountInput || !amountInput.value) {\n` +
`      alert('Please enter deposit amount');\n` +
`      return;\n` +
`    }\n` +
`    \n` +
`    const amount = parseFloat(amountInput.value);\n` +
`    \n` +
`    if (amount <= 0) {\n` +
`      alert('Please enter a valid amount');\n` +
`      return;\n` +
`    }\n` +
`    \n` +
`    if (!window.__userId) {\n` +
`      alert('User not found');\n` +
`      return;\n` +
`    }\n` +
`    \n` +
`    try {\n` +
`      const response = await fetch(API_BASE + '/api/deposit', {\n` +
`        method: 'POST',\n` +
`        headers: { 'Content-Type': 'application/json' },\n` +
`        body: JSON.stringify({\n` +
`          userId: window.__userId,\n` +
`          amount: amount,\n` +
`          txHash: 'manual_deposit_' + Date.now()\n` +
`        })\n` +
`      });\n` +
`      \n` +
`      const data = await response.json();\n` +
`      \n` +
`      if (data.success) {\n` +
`        // Clear input\n` +
`        amountInput.value = '';\n` +
`        \n` +
`        // Update displays\n` +
`        updateDepositHistory();\n` +
`        updateConfirmedDeposits();\n` +
`        \n` +
`        if (data.status === 'pending') {\n` +
`          alert(\`Deposit request submitted for $\${amount.toFixed(2)} USDT\\n\\nStatus: Under Review\\n\\nYour balance will be updated once the deposit is approved (usually within 24 hours).\`);\n` +
`        } else if (data.newBalance !== undefined) {\n` +
`          // Update balance display only if approved and newBalance is provided\n` +
`          const balEl = qs('balance');\n` +
`          if (balEl) balEl.textContent = '$' + data.newBalance.toFixed(2);\n` +
`          updateWalletBalance();\n` +
`          updatePortfolioStats();\n` +
`          alert(\`Deposit approved! $\${amount.toFixed(2)} has been added to your balance.\\n\\nNew Balance: $\${data.newBalance.toFixed(2)}\`);\n` +
`        } else {\n` +
`          alert(\`Deposit submitted successfully for $\${amount.toFixed(2)} USDT.\\n\\nStatus: Processing\`);\n` +
`        }\n` +
`      } else {\n` +
`        alert('Deposit failed: ' + (data.error || 'Unknown error'));\n` +
`      }\n` +
`    } catch (error) {\n` +
`      console.error('Deposit error:', error);\n` +
`      alert('Deposit failed. Please try again.');\n` +
`    }\n` +
`  }\n` +
`  \n` +
`  async function handleWithdraw() {\n` +
`    const amountInput = qs('withdraw-amount');\n` +
`    const addressInput = qs('withdraw-address');\n` +
`    \n` +
`    if (!amountInput || !amountInput.value) {\n` +
`      alert('Please enter withdrawal amount');\n` +
`      return;\n` +
`    }\n` +
`    \n` +
`    if (!addressInput || !addressInput.value) {\n` +
`      alert('Please enter your USDT TRC20 address');\n` +
`      return;\n` +
`    }\n` +
`    \n` +
`    const amount = parseFloat(amountInput.value);\n` +
`    const address = addressInput.value.trim();\n` +
`    \n` +
`    if (amount < 50) {\n` +
`      alert('Minimum withdrawal amount is $50');\n` +
`      return;\n` +
`    }\n` +
`    \n` +
`    // Validate TRC20 address format (basic)\n` +
`    if (!address.startsWith('T') || address.length !== 34) {\n` +
`      alert('Please enter a valid TRC20 address (starts with T, 34 characters)');\n` +
`      return;\n` +
`    }\n` +
`    \n` +
`    if (!window.__userId) {\n` +
`      alert('User not found');\n` +
`      return;\n` +
`    }\n` +
`    \n` +
`    try {\n` +
`      const response = await fetch(API_BASE + '/api/withdraw', {\n` +
`        method: 'POST',\n` +
`        headers: { 'Content-Type': 'application/json' },\n` +
`        body: JSON.stringify({\n` +
`          userId: window.__userId,\n` +
`          amount: amount,\n` +
`          address: address\n` +
`        })\n` +
`      });\n` +
`      \n` +
`      const data = await response.json();\n` +
`      \n` +
`      if (data.success) {\n` +
`        // Update balance display\n` +
`        const balEl = qs('balance');\n` +
`        if (balEl) balEl.textContent = '$' + data.data.newBalance.toFixed(2);\n` +
`        \n` +
`        // Update wallet balance\n` +
`        updateWalletBalance();\n` +
`        \n` +
`        // Clear inputs\n` +
`        amountInput.value = '';\n` +
`        addressInput.value = '';\n` +
`        \n` +
`        // Update displays\n` +
`        updateWithdrawHistory();\n` +
`        updateConfirmedWithdrawals();\n` +
`        updatePortfolioStats();\n` +
`        \n` +
`        alert(\`Withdrawal submitted successfully!\\n\\nAmount: $\${amount.toFixed(2)}\\nAddress: \${address}\\nNew Balance: $\${data.data.newBalance.toFixed(2)}\\n\\nProcessing time: 1-3 business days\`);\n` +
`      } else {\n` +
`        alert('Withdrawal failed: ' + (data.error || 'Unknown error'));\n` +
`      }\n` +
`    } catch (error) {\n` +
`      console.error('Withdrawal error:', error);\n` +
`      alert('Withdrawal failed. Please try again.');\n` +
`    }\n` +
`  }\n` +
`  \n` +
`  // Helper functions for filtering and sorting\n` +
`  function filterAndSortTransactions(transactions, statusFilterId, sortId) {\n` +
`    let filtered = [...transactions];\n` +
`    \n` +
`    // Apply status filter\n` +
`    const statusFilter = qs(statusFilterId);\n` +
`    if (statusFilter && statusFilter.value !== 'all') {\n` +
`      filtered = filtered.filter(tx => tx.status === statusFilter.value);\n` +
`    }\n` +
`    \n` +
`    // Apply sorting\n` +
`    const sortSelect = qs(sortId);\n` +
`    if (sortSelect) {\n` +
`      const sortValue = sortSelect.value;\n` +
`      filtered.sort((a, b) => {\n` +
`        switch(sortValue) {\n` +
`          case 'date-desc':\n` +
`            return new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt);\n` +
`          case 'date-asc':\n` +
`            return new Date(a.timestamp || a.createdAt) - new Date(b.timestamp || b.createdAt);\n` +
`          case 'amount-desc':\n` +
`            return Math.abs(b.amount) - Math.abs(a.amount);\n` +
`          case 'amount-asc':\n` +
`            return Math.abs(a.amount) - Math.abs(b.amount);\n` +
`          default:\n` +
`            return 0;\n` +
`        }\n` +
`      });\n` +
`    }\n` +
`    \n` +
`    return filtered;\n` +
`  }\n` +
`  \n` +
`  function filterAndSortAllTransactions(transactions, typeFilterId, sortId) {\n` +
`    let filtered = [...transactions];\n` +
`    \n` +
`    // Apply type filter\n` +
`    const typeFilter = qs(typeFilterId);\n` +
`    if (typeFilter && typeFilter.value !== 'all') {\n` +
`      filtered = filtered.filter(tx => tx.type === typeFilter.value);\n` +
`    }\n` +
`    \n` +
`    // Apply sorting\n` +
`    const sortSelect = qs(sortId);\n` +
`    if (sortSelect) {\n` +
`      const sortValue = sortSelect.value;\n` +
`      filtered.sort((a, b) => {\n` +
`        switch(sortValue) {\n` +
`          case 'date-desc':\n` +
`            return new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp);\n` +
`          case 'date-asc':\n` +
`            return new Date(a.createdAt || a.timestamp) - new Date(b.createdAt || b.timestamp);\n` +
`          case 'amount-desc':\n` +
`            return Math.abs(b.amount) - Math.abs(a.amount);\n` +
`          case 'amount-asc':\n` +
`            return Math.abs(a.amount) - Math.abs(b.amount);\n` +
`          default:\n` +
`            return 0;\n` +
`        }\n` +
`      });\n` +
`    }\n` +
`    \n` +
`    return filtered;\n` +
`  }\n` +
`  \n` +
`  function setupFilterListeners() {\n` +
`    // Setup deposit filter listeners\n` +
`    const depositStatusFilter = qs('deposit-status-filter');\n` +
`    const depositSort = qs('deposit-sort');\n` +
`    if (depositStatusFilter) depositStatusFilter.onchange = updateDepositHistory;\n` +
`    if (depositSort) depositSort.onchange = updateDepositHistory;\n` +
`    \n` +
`    // Setup withdrawal filter listeners\n` +
`    const withdrawStatusFilter = qs('withdraw-status-filter');\n` +
`    const withdrawSort = qs('withdraw-sort');\n` +
`    if (withdrawStatusFilter) withdrawStatusFilter.onchange = updateWithdrawHistory;\n` +
`    if (withdrawSort) withdrawSort.onchange = updateWithdrawHistory;\n` +
`    \n` +
`    // Setup transaction filter listeners\n` +
`    const transactionTypeFilter = qs('transaction-type-filter');\n` +
`    const transactionSort = qs('transaction-sort');\n` +
`    if (transactionTypeFilter) transactionTypeFilter.onchange = updateTransactionHistory;\n` +
`    if (transactionSort) transactionSort.onchange = updateTransactionHistory;\n` +
`  }\n` +
`  \n` +
`  async function updateDepositHistory() {\n` +
`    const container = qs('deposit-history');\n` +
`    if (!container) return;\n` +
`    \n` +
`    try {\n` +
`      console.log('[MiniApp] Fetching deposits for userId:', window.__userId);\n` +
`      const response = await fetch(\`\${API_BASE}/api/user/\${window.__userId}/transactions\`);\n` +
`      const data = await response.json();\n` +
`      console.log('[MiniApp] Deposits API response:', data);\n` +
`      \n` +
`      if (!data.success || !data.data || !data.data.transactions) {\n` +
`        console.error('No transactions data received from server:', data);\n` +
`        return;\n` +
`      }\n` +
`      \n` +
`      // Filter for deposit transactions\n` +
`      let deposits = data.data.transactions.filter(tx => tx.type === 'DEPOSIT');\n` +
`      \n` +
`      // Apply filters and sorting\n` +
`      deposits = filterAndSortTransactions(deposits, 'deposit-status-filter', 'deposit-sort');\n` +
`      \n` +
`      if (deposits.length === 0) {\n` +
`        container.innerHTML = \`\n` +
`          <div class="empty-state">\n` +
`            <div class="empty-state-icon">💰</div>\n` +
`            <div>No deposits match your filters</div>\n` +
`          </div>\n` +
`        \`;\n` +
`        return;\n` +
`      }\n` +
`      \n` +
`      container.innerHTML = deposits.map(deposit => {\n` +
`        const statusClass = deposit.status === 'APPROVED' ? 'status-completed' : 'status-under-review';\n` +
`        const statusText = deposit.status === 'APPROVED' ? 'Approved' : 'Under Review';\n` +
`        \n` +
`        return \`\n` +
`          <div class="wallet-transaction">\n` +
`            <div class="transaction-details">\n` +
`              <div class="transaction-amount">+$\${deposit.amount.toFixed(2)} USDT</div>\n` +
`              <div class="transaction-date">\${new Date(deposit.timestamp).toLocaleDateString()}</div>\n` +
`            </div>\n` +
`            <div class="transaction-status \${statusClass}">\${statusText}</div>\n` +
`          </div>\n` +
`        \`;\n` +
`      }).join('');\n` +
`      \n` +
`      // Setup filter event listeners\n` +
`      setupFilterListeners();\n` +
`    } catch (error) {\n` +
`      console.error('Error fetching deposit history:', error);\n` +
`      container.innerHTML = \`\n` +
`        <div class="empty-state">\n` +
`          <div class="empty-state-icon">⚠️</div>\n` +
`          <div>Error loading deposits</div>\n` +
`        </div>\n` +
`      \`;\n` +
`    }\n` +
`  }\n` +
`  \n` +
`  async function updateWithdrawHistory() {\n` +
`    const container = qs('withdraw-history');\n` +
`    if (!container) return;\n` +
`    \n` +
`    try {\n` +
`      console.log('[MiniApp] Fetching withdrawals for userId:', window.__userId);\n` +
`      const response = await fetch(\`\${API_BASE}/api/user/\${window.__userId}/transactions\`);\n` +
`      const data = await response.json();\n` +
`      console.log('[MiniApp] Withdrawals API response:', data);\n` +
`      \n` +
`      if (!data.success || !data.data?.transactions) {\n` +
`        console.error('No transactions data received from server:', data);\n` +
`        return;\n` +
`      }\n` +
`      \n` +
`      // Filter for withdraw transactions\n` +
`      let withdrawals = data.data.transactions.filter(tx => tx.type === 'WITHDRAW');\n` +
`      \n` +
`      // Apply filters and sorting\n` +
`      withdrawals = filterAndSortTransactions(withdrawals, 'withdraw-status-filter', 'withdraw-sort');\n` +
`      \n` +
`      if (withdrawals.length === 0) {\n` +
`        container.innerHTML = \`\n` +
`          <div class="empty-state">\n` +
`            <div class="empty-state-icon">📋</div>\n` +
`            <div>No withdrawals match your filters</div>\n` +
`          </div>\n` +
`        \`;\n` +
`        return;\n` +
`      }\n` +
`      \n` +
`      container.innerHTML = withdrawals.map(withdrawal => {\n` +
`        const statusClass = withdrawal.status === 'COMPLETED' ? 'status-completed' : 'status-processing';\n` +
`        const statusText = withdrawal.status === 'COMPLETED' ? 'Completed' : 'Processing';\n` +
`        const address = withdrawal.metadata?.address || 'N/A';\n` +
`        \n` +
`        return \`\n` +
`          <div class="wallet-transaction">\n` +
`            <div class="transaction-details">\n` +
`              <div class="transaction-amount">-$\${withdrawal.amount.toFixed(2)} USD</div>\n` +
`              <div class="transaction-date">\${new Date(withdrawal.timestamp).toLocaleDateString()}</div>\n` +
`              <div style="font-size:11px;color:#64748b;margin-top:2px">\${address.substring(0, 10)}...\${address.substring(-6)}</div>\n` +
`            </div>\n` +
`            <div class="transaction-status \${statusClass}">\${statusText}</div>\n` +
`          </div>\n` +
`        \`;\n` +
`      }).join('');\n` +
`      \n` +
`      // Setup filter event listeners\n` +
`      setupFilterListeners();\n` +
`    } catch (error) {\n` +
`      console.error('Error fetching withdrawal history:', error);\n` +
`      container.innerHTML = \`\n` +
`        <div class="empty-state">\n` +
`          <div class="empty-state-icon">⚠️</div>\n` +
`          <div>Error loading withdrawals</div>\n` +
`        </div>\n` +
`      \`;\n` +
`    }\n` +
`  }\n` +
`  \n` +
`  // Confirmed Deposits History (Approved only)\n` +
`  async function updateConfirmedDeposits() {\n` +
`    const container = qs('confirmed-deposits');\n` +
`    if (!container) return;\n` +
`    \n` +
`    try {\n` +
`      console.log('[MiniApp] Fetching confirmed deposits for userId:', window.__userId);\n` +
`      const response = await fetch(\`\${API_BASE}/api/user/\${window.__userId}/transactions\`);\n` +
`      const data = await response.json();\n` +
`      \n` +
`      if (!data.success || !data.data || !data.data.transactions) {\n` +
`        console.error('No transactions data received from server:', data);\n` +
`        return;\n` +
`      }\n` +
`      \n` +
`      // Filter for approved deposits only\n` +
`      const approvedDeposits = data.data.transactions.filter(tx => \n` +
`        tx.type === 'DEPOSIT' && (tx.status === 'APPROVED' || tx.meta?.status === 'approved')\n` +
`      );\n` +
`      \n` +
`      if (approvedDeposits.length === 0) {\n` +
`        container.innerHTML = \`\n` +
`          <div class="empty-state">\n` +
`            <div class="empty-state-icon">💰</div>\n` +
`            <div>No confirmed deposits</div>\n` +
`            <div style="font-size: 12px; margin-top: 5px; color: #64748b;">Approved deposits will appear here</div>\n` +
`          </div>\n` +
`        \`;\n` +
`        return;\n` +
`      }\n` +
`      \n` +
`      container.innerHTML = approvedDeposits.map(deposit => {\n` +
`        const approvedDate = new Date(deposit.approvedAt || deposit.createdAt).toLocaleDateString();\n` +
`        const txHash = deposit.metadata?.txHash || deposit.meta?.txHash || 'N/A';\n` +
`        \n` +
`        return \`\n` +
`          <div class="wallet-transaction confirmed">\n` +
`            <div class="transaction-details">\n` +
`              <div class="transaction-amount" style="color: #10b981;">+$\${deposit.amount.toFixed(2)} USDT</div>\n` +
`              <div class="transaction-date">Confirmed: \${approvedDate}</div>\n` +
`              \${txHash !== 'N/A' ? '<div style="font-size:11px;color:#64748b;margin-top:2px;">TX: ' + txHash.substring(0, 8) + '...</div>' : ''}\n` +
`            </div>\n` +
`            <div class="transaction-status status-confirmed">✅ Approved</div>\n` +
`          </div>\n` +
`        \`;\n` +
`      }).join('');\n` +
`    } catch (error) {\n` +
`      console.error('Error fetching confirmed deposits:', error);\n` +
`      container.innerHTML = \`\n` +
`        <div class="empty-state">\n` +
`          <div class="empty-state-icon">⚠️</div>\n` +
`          <div>Error loading confirmed deposits</div>\n` +
`        </div>\n` +
`      \`;\n` +
`    }\n` +
`  }\n` +
`  \n` +
`  // Confirmed Withdrawals History (Completed only)\n` +
`  async function updateConfirmedWithdrawals() {\n` +
`    const container = qs('confirmed-withdrawals');\n` +
`    if (!container) return;\n` +
`    \n` +
`    try {\n` +
`      console.log('[MiniApp] Fetching confirmed withdrawals for userId:', window.__userId);\n` +
`      const response = await fetch(\`\${API_BASE}/api/user/\${window.__userId}/transactions\`);\n` +
`      const data = await response.json();\n` +
`      \n` +
`      if (!data.success || !data.data || !data.data.transactions) {\n` +
`        console.error('No transactions data received from server:', data);\n` +
`        return;\n` +
`      }\n` +
`      \n` +
`      // Filter for completed withdrawals only\n` +
`      const completedWithdrawals = data.data.transactions.filter(tx => \n` +
`        tx.type === 'WITHDRAW' && (tx.status === 'COMPLETED')\n` +
`      );\n` +
`      \n` +
`      if (completedWithdrawals.length === 0) {\n` +
`        container.innerHTML = \`\n` +
`          <div class="empty-state">\n` +
`            <div class="empty-state-icon">💸</div>\n` +
`            <div>No completed withdrawals</div>\n` +
`            <div style="font-size: 12px; margin-top: 5px; color: #64748b;">Completed withdrawals will appear here</div>\n` +
`          </div>\n` +
`        \`;\n` +
`        return;\n` +
`      }\n` +
`      \n` +
`      container.innerHTML = completedWithdrawals.map(withdrawal => {\n` +
`        const completedDate = new Date(withdrawal.completedAt || withdrawal.createdAt).toLocaleDateString();\n` +
`        const address = withdrawal.metadata?.address || withdrawal.meta?.address || 'N/A';\n` +
`        const txHash = withdrawal.metadata?.txHash || 'Pending';\n` +
`        \n` +
`        return \`\n` +
`          <div class="wallet-transaction confirmed">\n` +
`            <div class="transaction-details">\n` +
`              <div class="transaction-amount" style="color: #dc2626;">-$\${Math.abs(withdrawal.amount).toFixed(2)} USDT</div>\n` +
`              <div class="transaction-date">Completed: \${completedDate}</div>\n` +
`              <div style="font-size:11px;color:#64748b;margin-top:2px;">\${address.substring(0, 10)}...\${address.substring(-6)}</div>\n` +
`              \${txHash !== 'Pending' ? '<div style="font-size:11px;color:#64748b;">TX: ' + txHash.substring(0, 8) + '...</div>' : ''}\n` +
`            </div>\n` +
`            <div class="transaction-status status-completed">✅ Completed</div>\n` +
`          </div>\n` +
`        \`;\n` +
`      }).join('');\n` +
`    } catch (error) {\n` +
`      console.error('Error fetching confirmed withdrawals:', error);\n` +
`      container.innerHTML = \`\n` +
`        <div class="empty-state">\n` +
`          <div class="empty-state-icon">⚠️</div>\n` +
`          <div>Error loading confirmed withdrawals</div>\n` +
`        </div>\n` +
`      \`;\n` +
`    }\n` +
`  }\n` +
`  \n` +
`  function getCurrentPrice(crypto) {\n` +
`    const prices = { BTC: 112000, ETH: 4170, XAU: 3780 };\n` +
`    return prices[crypto] + (Math.random() - 0.5) * 200;\n` +
`  }\n` +
`  \n` +
`  // Enhanced Manual Trading with 20-tick countdown\n` +
`  function executeManualTrade(action) {\n` +
`    const assetSelect = qs('manual-asset');\n` +
`    const amountInput = qs('trade-amount');\n` +
`    \n` +
`    if (!assetSelect || !amountInput) {\n` +
`      alert('Trading interface not found');\n` +
`      return;\n` +
`    }\n` +
`    \n` +
`    const asset = assetSelect.value;\n` +
`    let amount = parseFloat(amountInput.value);\n` +
`    \n` +
`    const currentBalance = parseFloat(qs('balance')?.textContent?.replace('$', '').replace(',', '') || '0');\n` +
`    \n` +
`    // Default to maximum balance if no amount specified\n` +
`    if (!amount || amount <= 0) {\n` +
`      amount = currentBalance;\n` +
`      amountInput.value = amount.toString();\n` +
`    }\n` +
`    \n` +
`    // Check amount against balance\n` +
`    if (amount > currentBalance) {\n` +
`      alert(\`Insufficient balance! Your balance: $\${currentBalance.toFixed(2)}, Requested: $\${amount.toFixed(2)}\`);\n` +
`      return;\n` +
`    }\n` +
`    \n` +
`    // Show what's happening\n` +
`    alert(\`Executing \${action} trade for \${asset} with $\${amount.toFixed(2)}\`);\n` +
`    \n` +
`    // Check if user is following AI recommendation exactly\n` +
`    let isFollowingAI = false;\n` +
`    let tradeType = 'manual';\n` +
`    \n` +
`    if (window.__currentSignal) {\n` +
`      const sameAsset = window.__currentSignal.crypto === asset;\n` +
`      const sameAction = window.__currentSignal.action === action;\n` +
`      \n` +
`      if (sameAsset && sameAction) {\n` +
`        isFollowingAI = true;\n` +
`        tradeType = 'following';\n` +
`      } else if (!sameAsset || !sameAction) {\n` +
`        isFollowingAI = false;\n` +
`        tradeType = 'opposing';\n` +
`      }\n` +
`      \n` +
`      console.log('[MiniApp] AI Signal Analysis:', {\n` +
`        aiRecommendation: \`\${window.__currentSignal.action} \${window.__currentSignal.crypto}\`,\n` +
`        userAction: \`\${action} \${asset}\`,\n` +
`        sameAsset,\n` +
`        sameAction,\n` +
`        tradeType,\n` +
`        expectedOutcome: isFollowingAI ? 'Profit 1.8-2.8%' : 'Loss 1.5-2.5%'\n` +
`      });\n` +
`    } else {\n` +
`      console.log('[MiniApp] No active AI signal - neutral trade');\n` +
`    }\n` +
`    \n` +
`    // Execute the trade with 20-tick countdown\n` +
`    executeTradeWithCountdown(action, asset, amount, isFollowingAI, tradeType);\n` +
`  }\n` +
`  \n` +
`  // New function for 20-tick countdown trading experience\n` +
`  function executeTradeWithCountdown(action, asset, amount, isFollowingAI = false, tradeType = 'manual') {\n` +
`    const startPrice = getCurrentPrice(asset);\n` +
`    const balanceEl = qs('balance');\n` +
`    let currentBalance = parseFloat(balanceEl?.textContent?.replace('$', '').replace(',', '') || '0');\n` +
`    \n` +
`    // Create countdown overlay\n` +
`    const overlay = document.createElement('div');\n` +
`    overlay.innerHTML = \`\n` +
`      <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:1000;display:flex;align-items:center;justify-content:center">\n` +
`        <div style="background:white;border-radius:20px;padding:30px;max-width:400px;width:90%;text-align:center;box-shadow:0 20px 40px rgba(0,0,0,0.3)">\n` +
`          <h2 style="margin:0 0 20px;color:#1e293b">\${action} \${asset}</h2>\n` +
`          <div style="font-size:18px;margin-bottom:10px;color:#64748b">Amount: $\${amount.toFixed(2)}</div>\n` +
`          <div style="font-size:14px;margin-bottom:20px;color:\${isFollowingAI ? '#10b981' : tradeType === 'opposing' ? '#ef4444' : '#f59e0b'}">\n` +
`            \${isFollowingAI ? '🤖' : tradeType === 'opposing' ? '❌' : '🧠 Manual Trade'}\n` +
`          </div>\n` +
`          <div style="font-size:48px;font-weight:bold;margin:20px 0;color:#3b82f6" id="countdown-number">20</div>\n` +
`          <div style="font-size:24px;font-weight:bold;margin:15px 0" id="pnl-display">P&L: $0.00 (0.0%)</div>\n` +
`          <div style="font-size:16px;color:#64748b" id="price-display">Price: $\${startPrice.toFixed(2)}</div>\n` +
`        </div>\n` +
`      </div>\n` +
`    \`;\n` +
`    document.body.appendChild(overlay);\n` +
`    \n` +
`    let tickCount = 20;\n` +
`    let currentPrice = startPrice;\n` +
`    \n` +
`    const countdown = setInterval(() => {\n` +
`      tickCount--;\n` +
`      \n` +
`      // AI-influenced price movement with specific profit/loss percentages\n` +
`      let finalPnlPct;\n` +
`      \n` +
`      if (isFollowingAI) {\n` +
`        // Following AI exactly (same coin + same side): 1.8% to 2.8% profit\n` +
`        finalPnlPct = 1.8 + (Math.random() * 1.0); // 1.8% to 2.8%\n` +
`        console.log('[MiniApp] Following AI exactly - target profit:', finalPnlPct.toFixed(2) + '%');\n` +
`      } else {\n` +
`        // Opposing AI or different coin: 1.5% to 2.5% loss\n` +
`        finalPnlPct = -(1.5 + (Math.random() * 1.0)); // -1.5% to -2.5%\n` +
`        console.log('[MiniApp] Not following AI - target loss:', finalPnlPct.toFixed(2) + '%');\n` +
`      }\n` +
`      \n` +
`      // Calculate required price change to achieve target P&L percentage\n` +
`      let targetPrice;\n` +
`      if (action === 'BUY') {\n` +
`        targetPrice = startPrice * (1 + finalPnlPct / 100);\n` +
`      } else {\n` +
`        targetPrice = startPrice * (1 - finalPnlPct / 100);\n` +
`      }\n` +
`      \n` +
`      // Gradually move price towards target over the 20 ticks\n` +
`      const progress = tickCount / 20; // How far through the countdown we are\n` +
`      const smoothing = 0.3; // How much randomness to add\n` +
`      \n` +
`      // Linear interpolation towards target with some randomness\n` +
`      const targetChange = targetPrice - startPrice;\n` +
`      const expectedChange = targetChange * (1 - progress);\n` +
`      const randomVariation = (Math.random() - 0.5) * startPrice * 0.01; // ±1% random variation\n` +
`      \n` +
`      currentPrice = startPrice + expectedChange + (randomVariation * smoothing);\n` +
`      \n` +
`      // Calculate P&L based on current price\n` +
`      let pnl, pnlPct;\n` +
`      if (action === 'BUY') {\n` +
`        pnlPct = ((currentPrice - startPrice) / startPrice) * 100;\n` +
`        pnl = amount * (pnlPct / 100);\n` +
`      } else {\n` +
`        pnlPct = ((startPrice - currentPrice) / startPrice) * 100;\n` +
`        pnl = amount * (pnlPct / 100);\n` +
`      }\n` +
`      \n` +
`      // Update display\n` +
`      const countdownEl = overlay.querySelector('#countdown-number');\n` +
`      const pnlEl = overlay.querySelector('#pnl-display');\n` +
`      const priceEl = overlay.querySelector('#price-display');\n` +
`      \n` +
`      if (countdownEl) countdownEl.textContent = tickCount;\n` +
`      if (pnlEl) {\n` +
`        pnlEl.textContent = \`P&L: \${pnl >= 0 ? '+' : ''}$\${pnl.toFixed(2)} (\${pnl >= 0 ? '+' : ''}\${pnlPct.toFixed(1)}%)\`;\n` +
`        pnlEl.style.color = pnl >= 0 ? '#10b981' : '#ef4444';\n` +
`      }\n` +
`      if (priceEl) priceEl.textContent = \`Price: $\${currentPrice.toFixed(2)}\`;\n` +
`      \n` +
`      if (tickCount <= 0) {\n` +
`        clearInterval(countdown);\n` +
`        \n` +
`        // Final result display\n` +
`        const newBalance = currentBalance + pnl;\n` +
`        \n` +
`        overlay.innerHTML = \`\n` +
`          <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:1000;display:flex;align-items:center;justify-content:center">\n` +
`            <div style="background:white;border-radius:20px;padding:40px;max-width:450px;width:90%;text-align:center;box-shadow:0 20px 40px rgba(0,0,0,0.3)">\n` +
`              <div style="font-size:64px;margin-bottom:20px">\${pnl >= 0 ? '🎉' : '😔'}</div>\n` +
`              <h2 style="margin:0 0 15px;color:\${pnl >= 0 ? '#10b981' : '#ef4444'}">\${pnl >= 0 ? 'WIN!' : 'LOSS'}</h2>\n` +
`              <div style="font-size:14px;color:#64748b;margin-bottom:15px">\n` +
`                \${isFollowingAI ? '🤖 Followed AI Recommendation Exactly' : tradeType === 'opposing' ? '❌ Opposed AI Recommendation' : '🧠 Manual Decision'}\n` +
`              </div>\n` +
`              <div style="font-size:32px;font-weight:bold;margin:20px 0;color:\${pnl >= 0 ? '#10b981' : '#ef4444'}">\n` +
`                \${pnl >= 0 ? '+' : ''}$\${pnl.toFixed(2)}\n` +
`              </div>\n` +
`              <div style="font-size:20px;color:#64748b;margin:15px 0">(\${pnl >= 0 ? '+' : ''}\${pnlPct.toFixed(1)}%)</div>\n` +
`              <div style="border-top:1px solid #e5e7eb;padding-top:20px;margin-top:20px">\n` +
`                <div style="color:#64748b;margin-bottom:10px">New Balance</div>\n` +
`                <div style="font-size:24px;font-weight:bold;color:#1e293b">$\${newBalance.toFixed(2)}</div>\n` +
`              </div>\n` +
`              <button id="close-trade-result" style="margin-top:25px;padding:12px 30px;background:#3b82f6;color:white;border:none;border-radius:10px;font-size:16px;cursor:pointer">Close</button>\n` +
`            </div>\n` +
`          </div>\n` +
`        \`;\n` +
`        \n` +
`        // Add close button event listener\n` +
`        const closeBtn = overlay.querySelector('#close-trade-result');\n` +
`        if (closeBtn) {\n` +
`          closeBtn.addEventListener('click', () => {\n` +
`            overlay.remove();\n` +
`          });\n` +
`        }\n` +
`        \n` +
`        // Update balance\n` +
`        if (balanceEl) {\n` +
`          balanceEl.textContent = \`$\${newBalance.toFixed(2)}\`;\n` +
`        }\n` +
`        \n` +
`        // Save to transaction history\n` +
`        const transaction = {\n` +
`          action,\n` +
`          asset,\n` +
`          amount,\n` +
`          pnl,\n` +
`          pnlPct,\n` +
`          startPrice,\n` +
`          endPrice: currentPrice,\n` +
`          timestamp: Date.now()\n` +
`        };\n` +
`        \n` +
`        const history = JSON.parse(localStorage.getItem('tradeHistory') || '[]');\n` +
`        history.push(transaction);\n` +
`        localStorage.setItem('tradeHistory', JSON.stringify(history));\n` +
`        \n` +
`        // Send trade to API for persistence (in addition to localStorage)\n` +
`        const tradeId = 'animated_' + Date.now().toString(36);\n` +
`        const ticks = [startPrice, currentPrice]; // Simplified tick data for animated trades\n` +
`        finalizeTrade(tradeId, action, asset, startPrice, currentPrice, pnl, pnlPct, ticks, isFollowingAI);\n` +
`        \n` +
`        // Update portfolio stats after new transaction\n` +
`        updatePortfolioStats();\n` +
`      }\n` +
`    }, 1000);\n` +
`  }\n` +
`  \n` +
`  setTimeout(()=>{ if(!window.__miniAppReady){ const fe=qs('fallback-error'); if(fe) fe.style.display='block'; showDebug('Init timeout'); } }, 8000);\n` +
`  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();\n` +
`  \n` +
`  // closeTrade already made globally available above\n` +
`})();\n`;
}
