// Extracted Mini App HTML generator for clarity.
import type { Env } from './worker.js';

export function renderMiniApp(env: Env): Response {
  const baseUrl = env.BASE_URL || 'https://promotion-trade-bot.tradermindai.workers.dev';
  return new Response(MINIAPP_HTML(baseUrl), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Content-Security-Policy': "default-src 'self' https:; script-src 'self' https://telegram.org https://cdn.jsdelivr.net; connect-src 'self' https: wss:; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:" 
    }
  });
}

function MINIAPP_HTML(baseUrl: string): string {
  const version = Date.now();
  return `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8" />\n<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n<title>TradeX Pro - AI Trading Bot</title>\n<!-- version:${version} -->\n<script src="https://telegram.org/js/telegram-web-app.js" defer></script>\n<script src="https://cdn.jsdelivr.net/npm/chart.js" defer></script>\n<style>${INLINE_CSS}</style>\n</head>\n<body>\n${APP_HTML}\n<script src="/miniapp/app.js?v=${version}" defer></script>\n</body>\n</html>`;
}

// --- Inline CSS - Modern and User-Friendly Design ---
const INLINE_CSS = `
* { 
  margin: 0; 
  padding: 0; 
  box-sizing: border-box; 
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #333;
  min-height: 100vh;
  padding: 0;
  margin: 0;
}

.app-container {
  max-width: 430px;
  margin: 0 auto;
  background: white;
  min-height: 100vh;
  box-shadow: 0 0 30px rgba(0,0,0,0.2);
  position: relative;
  overflow: hidden;
}

.app-header {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  padding: 20px;
  text-align: center;
  position: relative;
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
}

.app-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="20" cy="20" r="2" fill="rgba(255,255,255,0.1)"/><circle cx="80" cy="40" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="40" cy="80" r="1.5" fill="rgba(255,255,255,0.1)"/></svg>');
  pointer-events: none;
}

.brand {
  position: relative;
  z-index: 1;
}

.brand h1 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 5px;
  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.brand .subtitle {
  font-size: 14px;
  opacity: 0.9;
  font-weight: 400;
}

.balance-display {
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  padding: 15px;
  margin: 15px 0 0 0;
  border: 1px solid rgba(255,255,255,0.2);
}

.balance-amount {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 5px;
}

.balance-label {
  font-size: 12px;
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.main-content {
  padding: 25px 20px;
  background: #f8fafc;
  min-height: calc(100vh - 200px);
}

.section {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  border: 1px solid rgba(0,0,0,0.05);
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 15px;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 8px;
}

.price-grid {
  display: grid;
  gap: 12px;
}

.price-item {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
  cursor: pointer;
}

.price-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  border-color: #3b82f6;
}

.crypto-info h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}

.crypto-symbol {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.price-value {
  text-align: right;
}

.price-amount {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
}

.price-change {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 6px;
}

.price-change.positive {
  background: rgba(34, 197, 94, 0.1);
  color: #059669;
}

.price-change.negative {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.signal-card {
  background: linear-gradient(135deg, #fef3c7 0%, #fbbf24 100%);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid #f59e0b;
  position: relative;
  overflow: hidden;
}

.signal-card::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%);
  pointer-events: none;
}

.signal-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
  position: relative;
  z-index: 1;
}

.signal-icon {
  width: 40px;
  height: 40px;
  background: rgba(255,255,255,0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 15px;
}

.btn {
  flex: 1;
  padding: 14px 20px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255,255,255,0.3);
  transition: all 0.3s ease;
  transform: translate(-50%, -50%);
}

.btn:active::before {
  width: 300px;
  height: 300px;
}

.btn-follow {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
}

.btn-follow:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
}

.btn-ignore {
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(107, 114, 128, 0.4);
}

.btn-ignore:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(107, 114, 128, 0.5);
}

.nav-tabs {
  display: flex;
  background: rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 4px;
  margin-top: 15px;
  backdrop-filter: blur(10px);
}

.nav-tab {
  flex: 1;
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: rgba(255,255,255,0.7);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.nav-tab.active {
  background: rgba(255,255,255,0.2);
  color: white;
  font-weight: 600;
}

.tab-section {
  display: none;
}

.tab-section.active {
  display: block;
}

.transaction-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  margin-bottom: 8px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.transaction-item:hover {
  transform: translateX(5px);
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.loading-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255,255,255,0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #64748b;
}

.empty-state-icon {
  font-size: 48px;
  margin-bottom: 15px;
  opacity: 0.5;
}

/* Portfolio Styles */
.portfolio-card {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 15px;
  padding: 20px;
  margin-bottom: 15px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  transition: all 0.3s ease;
}

.portfolio-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

.portfolio-card.wins {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  border-color: #10b981;
}

.portfolio-card.losses {
  background: linear-gradient(135deg, #fed7d7 0%, #feb2b2 100%);
  border-color: #ef4444;
}

.portfolio-card-title {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.portfolio-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.stat-item {
  text-align: center;
  padding: 12px;
  background: rgba(255,255,255,0.6);
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.8);
}

.stat-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.stat-value.profit {
  color: #10b981;
}

.stat-value.loss {
  color: #ef4444;
}

/* Wallet Styles */
.wallet-balance-card {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border-radius: 15px;
  padding: 25px;
  margin-bottom: 20px;
  color: white;
  text-align: center;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
}

.balance-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.balance-label {
  font-size: 14px;
  opacity: 0.9;
  font-weight: 500;
}

.balance-amount {
  font-size: 32px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.wallet-section {
  margin-bottom: 25px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 15px;
  padding: 20px;
  border: 1px solid #e2e8f0;
}

.wallet-section-title {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.deposit-card, .withdraw-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e5e7eb;
  margin-bottom: 15px;
}

.deposit-address-section {
  text-align: center;
  margin-bottom: 20px;
  padding: 15px;
  background: rgba(59, 130, 246, 0.05);
  border-radius: 10px;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.address-label {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 10px;
  font-weight: 500;
}

.wallet-address {
  font-family: 'Courier New', monospace;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  background: rgba(255,255,255,0.8);
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  margin-bottom: 15px;
  word-break: break-all;
  cursor: pointer;
}

.qr-code-container {
  display: flex;
  justify-content: center;
  margin: 15px 0;
}

.qr-placeholder {
  width: 120px;
  height: 120px;
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  border: 2px dashed #9ca3af;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #6b7280;
  cursor: pointer;
}

.qr-code {
  width: 120px;
  height: 120px;
  border-radius: 10px;
  border: 2px solid #e5e7eb;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.qr-code:hover {
  transform: scale(1.05);
}

.input-group {
  margin-bottom: 15px;
}

.input-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 5px;
}

.input-group input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s ease;
  box-sizing: border-box;
}

.input-group input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.wallet-btn {
  width: 100%;
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.deposit-btn {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.deposit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
}

.withdraw-btn {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.withdraw-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
}

.withdraw-info {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 15px;
}

.withdraw-note {
  font-size: 14px;
  color: #dc2626;
  font-weight: 600;
  text-align: center;
}

.wallet-history {
  margin-top: 15px;
}

.wallet-history h4 {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 10px;
}

.transaction-list {
  background: white;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  min-height: 60px;
}

.wallet-transaction {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #f3f4f6;
}

.wallet-transaction:last-child {
  border-bottom: none;
}

.transaction-details {
  flex: 1;
}

.transaction-amount {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.transaction-date {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

.transaction-status {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-under-review {
  background: rgba(245, 158, 11, 0.2);
  color: #d97706;
}

.status-processing {
  background: rgba(59, 130, 246, 0.2);
  color: #2563eb;
}

.status-completed {
  background: rgba(16, 185, 129, 0.2);
  color: #059669;
}

.status-confirmed {
  background: rgba(16, 185, 129, 0.2);
  color: #059669;
}

.wallet-transaction.confirmed {
  background: rgba(16, 185, 129, 0.05);
  border-left: 3px solid #10b981;
}

/* Transaction Filters */
.transaction-filters {
  margin-bottom: 15px;
  padding: 15px;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
}

.filter-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-select {
  flex: 1;
  min-width: 140px;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
}

.filter-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

@media (max-width: 480px) {
  .main-content {
    padding: 20px 15px;
  }
  
  .section {
    padding: 16px;
  }
}
`;

// --- Inline JS (truncated placeholder referencing baseUrl variable) ---
const INLINE_JS = (baseUrl: string) => `var API_BASE = '${baseUrl}';\n// Original inline JS logic kept in worker for now. TODO: externalize.`;

// --- Modern App HTML Structure ---
const APP_HTML = `
<div class="app-container">
  <header class="app-header">
    <div class="brand">
      <h1>TradeX Pro</h1>
      <div class="subtitle">AI-Powered Trading Platform</div>
      <div id="user-greeting" style="font-size: 14px; margin-top: 8px; opacity: 0.9; font-weight: 500;">
        Welcome, Trader!
      </div>
    </div>
    <div class="balance-display">
      <div class="balance-amount" id="balance">$10,000.00</div>
      <div class="balance-label">Portfolio Balance</div>
    </div>
    <nav class="nav-tabs">
      <button class="nav-tab active" data-tab-switch="trade">Trade</button>
      <button class="nav-tab" data-tab-switch="portfolio">Portfolio</button>
      <button class="nav-tab" data-tab-switch="wallet">Wallet</button>
      <button class="nav-tab" data-tab-switch="history">History</button>
    </nav>
  </header>
  
  <main class="main-content">
    <section id="trade-tab" class="tab-section active" data-tab-panel="trade">
      <div class="section">
        <h2 class="section-title">🤖 AI Trading Signals</h2>
        <div id="ai-signals">
          <div class="empty-state">
            <div class="empty-state-icon">🔍</div>
            <div>AI is analyzing market conditions...</div>
          </div>
        </div>
        
        <!-- Manual Trading Controls -->
        <div style="margin-top: 20px; padding: 20px; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); border-radius: 16px; border: 1px solid #cbd5e1;">
          <h3 style="margin: 0 0 15px; font-size: 16px; font-weight: 600; color: #1e293b; display: flex; align-items: center; gap: 8px;">
            💼 Manual Trading
          </h3>
          
          <div style="display: grid; gap: 12px; margin-bottom: 15px;">
            <div>
              <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px;">
                Select Asset:
              </label>
              <select id="manual-asset" style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; background: white;">
                <option value="BTC">Bitcoin (BTC)</option>
                <option value="ETH">Ethereum (ETH)</option>
                <option value="XAU">Gold (XAU)</option>
              </select>
            </div>
            
            <div>
              <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px;">
                Amount ($):
              </label>
              <input type="number" id="trade-amount" placeholder="Enter amount" value="100" min="1" max="10000" 
                     style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; box-sizing: border-box;">
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <button id="manual-buy-btn" class="btn" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);">
              🚀 Buy
            </button>
            <button id="manual-sell-btn" class="btn" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);">
              📉 Sell
            </button>
          </div>
        </div>
      </div>
      
      <div class="section">
        <h2 class="section-title">📊 Live Market Prices</h2>
        <div class="price-grid" id="crypto-list">
          <div class="empty-state">
            <div class="loading-spinner"></div>
            <div style="margin-top: 15px;">Loading market data...</div>
          </div>
        </div>
      </div>
    </section>
    
    <section id="portfolio-tab" class="tab-section" data-tab-panel="portfolio">
      <div class="section">
        <h2 class="section-title">💼 Portfolio Overview</h2>
        
        <!-- Account Summary -->
        <div class="portfolio-card">
          <h3 class="portfolio-card-title">💰 Account Summary</h3>
          <div class="portfolio-stats">
            <div class="stat-item">
              <div class="stat-label">Current Balance</div>
              <div class="stat-value" id="portfolio-balance">$10,000.00</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Initial Deposit</div>
              <div class="stat-value" id="portfolio-deposit">$10,000.00</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Gift Bonus</div>
              <div class="stat-value" id="portfolio-gift">$0.00</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Total P&L</div>
              <div class="stat-value" id="portfolio-total-pnl">$0.00</div>
            </div>
          </div>
        </div>

        <!-- Trading Statistics -->
        <div class="portfolio-card">
          <h3 class="portfolio-card-title">� Trading Statistics</h3>
          <div class="portfolio-stats">
            <div class="stat-item">
              <div class="stat-label">Total Trades</div>
              <div class="stat-value" id="portfolio-total-trades">0</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Win Rate</div>
              <div class="stat-value" id="portfolio-win-rate">0%</div>
            </div>
          </div>
        </div>

        <!-- Wins Section -->
        <div class="portfolio-card wins">
          <h3 class="portfolio-card-title">🎉 Winning Trades</h3>
          <div class="portfolio-stats">
            <div class="stat-item">
              <div class="stat-label">Total Wins</div>
              <div class="stat-value" id="portfolio-wins-count">0</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Profit Amount</div>
              <div class="stat-value profit" id="portfolio-wins-amount">$0.00</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Average Win</div>
              <div class="stat-value profit" id="portfolio-avg-win">$0.00</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Best Win</div>
              <div class="stat-value profit" id="portfolio-best-win">$0.00</div>
            </div>
          </div>
        </div>

        <!-- Losses Section -->
        <div class="portfolio-card losses">
          <h3 class="portfolio-card-title">😔 Losing Trades</h3>
          <div class="portfolio-stats">
            <div class="stat-item">
              <div class="stat-label">Total Losses</div>
              <div class="stat-value" id="portfolio-losses-count">0</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Loss Amount</div>
              <div class="stat-value loss" id="portfolio-losses-amount">$0.00</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Average Loss</div>
              <div class="stat-value loss" id="portfolio-avg-loss">$0.00</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Worst Loss</div>
              <div class="stat-value loss" id="portfolio-worst-loss">$0.00</div>
            </div>
          </div>
        </div>
      </div>
    </section>
    
    <section id="wallet-tab" class="tab-section" data-tab-panel="wallet">
      <div class="section">
        <h2 class="section-title">💳 My Wallet</h2>
        
        <!-- Balance Display -->
        <div class="wallet-balance-card">
          <div class="balance-info">
            <div class="balance-label">Available Balance</div>
            <div class="balance-amount" id="wallet-balance">$10,000.00</div>
          </div>
        </div>

        <!-- Deposit Section -->
        <div class="wallet-section">
          <h3 class="wallet-section-title">📥 Deposit USDT (TRC20)</h3>
          <div class="deposit-card">
            <div class="deposit-address-section">
              <div class="address-label">Send USDT (TRC20) to this address:</div>
              <div class="wallet-address" id="usdt-address">TKq4ZYq44yvXA38XVD1pwqc4zgteQ7NuNn</div>
              <div class="qr-code-container">
                <img src="data:image/png;base64,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" alt="USDT TRC20 QR Code" class="qr-code" />
              </div>
            </div>
            
            <div class="deposit-form">
              <div class="input-group">
                <label for="deposit-amount">Amount (USDT)</label>
                <input type="number" id="deposit-amount" placeholder="Enter USDT amount" min="1" step="0.01">
              </div>
              <button id="deposit-confirm-btn" class="wallet-btn deposit-btn">I Transferred</button>
            </div>
          </div>
          
          <!-- Deposit History -->
          <div class="wallet-history">
            <h4>Recent Deposits</h4>
            <div class="transaction-filters">
              <div class="filter-row">
                <select id="deposit-status-filter" class="filter-select">
                  <option value="all">All Status</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
                <select id="deposit-sort" class="filter-select">
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="amount-desc">Amount High to Low</option>
                  <option value="amount-asc">Amount Low to High</option>
                </select>
              </div>
            </div>
            <div id="deposit-history" class="transaction-list">
              <div class="empty-state">
                <div class="empty-state-icon">💰</div>
                <div>No deposits yet</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Withdraw Section -->
        <div class="wallet-section">
          <h3 class="wallet-section-title">📤 Withdraw USDT (TRC20)</h3>
          <div class="withdraw-card">
            <div class="withdraw-info">
              <div class="withdraw-note">Minimum withdrawal: $50 USD</div>
            </div>
            
            <div class="withdraw-form">
              <div class="input-group">
                <label for="withdraw-amount">Amount (USD)</label>
                <input type="number" id="withdraw-amount" placeholder="Minimum $50" min="50" step="0.01">
              </div>
              <div class="input-group">
                <label for="withdraw-address">Your USDT TRC20 Address</label>
                <input type="text" id="withdraw-address" placeholder="Enter your TRC20 wallet address">
              </div>
              <button id="withdraw-submit-btn" class="wallet-btn withdraw-btn">Submit Request</button>
            </div>
          </div>
          
          <!-- Withdraw History -->
          <div class="wallet-history">
            <h4>Withdrawal Requests</h4>
            <div class="transaction-filters">
              <div class="filter-row">
                <select id="withdraw-status-filter" class="filter-select">
                  <option value="all">All Status</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="REJECTED">Rejected</option>
                </select>
                <select id="withdraw-sort" class="filter-select">
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="amount-desc">Amount High to Low</option>
                  <option value="amount-asc">Amount Low to High</option>
                </select>
              </div>
            </div>
            <div id="withdraw-history" class="transaction-list">
              <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <div>No withdrawal requests yet</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Confirmed Deposits Section -->
        <div class="wallet-section">
          <h3 class="wallet-section-title">✅ Confirmed Deposits</h3>
          <div class="wallet-history">
            <div id="confirmed-deposits" class="transaction-list">
              <div class="empty-state">
                <div class="empty-state-icon">💰</div>
                <div>No confirmed deposits</div>
                <div style="font-size: 12px; margin-top: 5px; color: #64748b;">Approved deposits will appear here</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Confirmed Withdrawals Section -->
        <div class="wallet-section">
          <h3 class="wallet-section-title">✅ Confirmed Withdrawals</h3>
          <div class="wallet-history">
            <div id="confirmed-withdrawals" class="transaction-list">
              <div class="empty-state">
                <div class="empty-state-icon">💸</div>
                <div>No completed withdrawals</div>
                <div style="font-size: 12px; margin-top: 5px; color: #64748b;">Completed withdrawals will appear here</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    
    <section id="history-tab" class="tab-section" data-tab-panel="history">
      <div class="section">
        <h2 class="section-title">📋 Transaction History</h2>
        <div class="transaction-filters">
          <div class="filter-row">
            <select id="transaction-type-filter" class="filter-select">
              <option value="all">All Types</option>
              <option value="DEPOSIT">Deposits</option>
              <option value="WITHDRAW">Withdrawals</option>
              <option value="TRADE_PNL">Trades</option>
              <option value="ADJUSTMENT">Adjustments</option>
            </select>
            <select id="transaction-sort" class="filter-select">
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Amount High to Low</option>
              <option value="amount-asc">Amount Low to High</option>
            </select>
          </div>
        </div>
        <div id="transaction-history">
          <div class="empty-state">
            <div class="empty-state-icon">📝</div>
            <div>No transactions yet</div>
          </div>
        </div>
      </div>
    </section>
  </main>
</div>`;
