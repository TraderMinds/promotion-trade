export interface TickData {
  t: number; // epoch ms
  price: number;
  volume?: number;
  source?: string;
}

export interface SimulationResult {
  ticks: TickData[];
  entryPrice: number;
  exitPrice: number;
  profit: number; // in quote currency
  direction: 'BUY' | 'SELL';
  realPrice?: number;
  priceSource?: string;
}

// Real-time pricing from multiple sources
const PRICE_SOURCES = {
  COINGECKO: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
  BINANCE: 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT',
};

interface RealPriceData {
  price: number;
  source: string;
  timestamp: number;
}

export async function getRealPrice(): Promise<RealPriceData> {
  try {
    // Try CoinGecko first (most reliable)
    const response = await fetch(PRICE_SOURCES.COINGECKO);
    const data = await response.json() as any;
    
    if (data.bitcoin?.usd) {
      return {
        price: data.bitcoin.usd,
        source: 'CoinGecko',
        timestamp: Date.now()
      };
    }
    
    // Fallback to Binance
    const binanceResponse = await fetch(PRICE_SOURCES.BINANCE);
    const binanceData = await binanceResponse.json() as any;
    
    if (binanceData.price) {
      return {
        price: parseFloat(binanceData.price),
        source: 'Binance',
        timestamp: Date.now()
      };
    }
    
    throw new Error('All price sources failed');
  } catch (error) {
    console.error('Price fetch error:', error);
    // Fallback to simulation with realistic BTC price base
    return {
      price: 65000 + (Math.random() * 2000 - 1000), // $64k-$66k range
      source: 'Simulation',
      timestamp: Date.now()
    };
  }
}

// Deterministic pseudo-random generator for reproducibility per user
function lcg(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

export function simulateTicks(seed: number, startPrice = 1000, count = 20): TickData[] {
  const rand = lcg(seed);
  let p = startPrice;
  const out: TickData[] = [];
  for (let i = 0; i < count; i++) {
    // small drift + random noise
    const drift = 0.2; // slight upward bias so users often win
    const change = (rand() - 0.5) * 4 + drift; // ~ +/-2 + drift
    p = Math.max(100, p + change);
    out.push({ 
      t: Date.now() + i * 1000, 
      price: +(p.toFixed(2)),
      volume: Math.floor(rand() * 50000) + 10000
    });
  }
  return out;
}

export async function simulateRealTicks(seed: number, count = 20): Promise<TickData[]> {
  const ticks: TickData[] = [];
  const realPrice = await getRealPrice();
  let currentPrice = realPrice.price;
  const rand = lcg(seed);
  
  for (let i = 0; i < count; i++) {
    // More realistic price movements based on market volatility
    const volatility = 0.0002; // 0.02% base volatility
    
    // Normal distribution for price changes
    const random = rand();
    const change = (random - 0.5) * 2 * volatility * currentPrice;
    currentPrice += change;
    
    ticks.push({
      t: Date.now() + (i * 1000),
      price: parseFloat(currentPrice.toFixed(2)),
      volume: Math.floor(random * 50000) + 10000,
      source: realPrice.source
    });
  }
  
  return ticks;
}

export function mockAISignal(ticks: TickData[]) {
  if (ticks.length < 2) return 'BUY' as const;
  
  // Enhanced AI logic with technical indicators
  const prices = ticks.map(t => t.price);
  const latest = prices[prices.length - 1];
  
  // Simple Moving Averages
  const sma5 = prices.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, prices.length);
  const sma10 = prices.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, prices.length);
  const sma20 = prices.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, prices.length);
  
  // RSI Calculation (Relative Strength Index)
  const rsi = calculateRSI(prices, 14);
  
  // MACD Calculation
  const macdLine = calculateEMA(prices, 12) - calculateEMA(prices, 26);
  const signalLine = calculateEMA([macdLine], 9);
  const macdHistogram = macdLine - signalLine;
  
  // Bollinger Bands
  const bbResult = calculateBollingerBands(prices, 20, 2);
  
  // Volume analysis
  const volumes = ticks.map(t => t.volume || 1000);
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const currentVolume = volumes[volumes.length - 1];
  const volumeRatio = currentVolume / avgVolume;
  
  // Calculate momentum
  const momentum = prices.length >= 3 ? 
    (latest - prices[prices.length - 3]) / prices[prices.length - 3] : 0;
  
  // Price volatility
  const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
  const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length);
  
  // Multi-factor scoring system
  let buyScore = 0;
  let sellScore = 0;
  
  // Trend following signals
  if (latest > sma5 && sma5 > sma10 && sma10 > sma20) buyScore += 3;
  if (latest < sma5 && sma5 < sma10 && sma10 < sma20) sellScore += 3;
  
  // RSI signals
  if (rsi < 30) buyScore += 2; // Oversold
  if (rsi > 70) sellScore += 2; // Overbought
  if (rsi > 50 && rsi < 70) buyScore += 1; // Bullish momentum
  if (rsi < 50 && rsi > 30) sellScore += 1; // Bearish momentum
  
  // MACD signals
  if (macdLine > signalLine && macdHistogram > 0) buyScore += 2;
  if (macdLine < signalLine && macdHistogram < 0) sellScore += 2;
  
  // Bollinger Bands signals
  if (latest <= bbResult.lower) buyScore += 2; // Price at lower band - potential bounce
  if (latest >= bbResult.upper) sellScore += 2; // Price at upper band - potential reversal
  
  // Volume confirmation
  if (volumeRatio > 1.5) {
    if (momentum > 0) buyScore += 1;
    if (momentum < 0) sellScore += 1;
  }
  
  // Momentum signals
  if (momentum > 0.001 && volatility < 0.02) buyScore += 1;
  if (momentum < -0.001 && volatility < 0.02) sellScore += 1;
  
  // Market sentiment (simulated news/social sentiment)
  const sentimentScore = generateSentimentScore();
  if (sentimentScore > 0.6) buyScore += 1;
  if (sentimentScore < 0.4) sellScore += 1;
  
  // Final decision with confidence scoring
  if (buyScore > sellScore + 1) return 'BUY';
  if (sellScore > buyScore + 1) return 'SELL';
  
  // If scores are close, use trend following as tiebreaker
  return latest >= prices[0] ? 'BUY' : 'SELL';
}

// Technical indicator helper functions
function calculateRSI(prices: number[], period: number): number {
  if (prices.length < period) return 50; // Neutral if not enough data
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i < Math.min(period + 1, prices.length); i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  if (prices.length === 1) return prices[0];
  
  const multiplier = 2 / (period + 1);
  let ema = prices[0];
  
  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
  }
  
  return ema;
}

function calculateBollingerBands(prices: number[], period: number, stdDev: number) {
  const slice = prices.slice(-period);
  const sma = slice.reduce((a, b) => a + b, 0) / slice.length;
  
  const variance = slice.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / slice.length;
  const std = Math.sqrt(variance);
  
  return {
    upper: sma + (std * stdDev),
    middle: sma,
    lower: sma - (std * stdDev)
  };
}

function generateSentimentScore(): number {
  // Simulated sentiment analysis (in real app, this would call news/social media APIs)
  const marketFear = Math.sin(Date.now() / 1000000) * 0.3 + 0.5;
  const socialBuzz = Math.cos(Date.now() / 2000000) * 0.2 + 0.5;
  return (marketFear + socialBuzz) / 2;
}

export function runTrade(seed: number, amount: number): SimulationResult {
  const ticks = simulateTicks(seed);
  const direction = mockAISignal(ticks);
  const entryPrice = ticks[0].price;
  const exitPrice = ticks[ticks.length - 1].price;
  let profit: number;
  if (direction === 'BUY') {
    profit = (exitPrice - entryPrice) / entryPrice * amount;
  } else {
    profit = (entryPrice - exitPrice) / entryPrice * amount;
  }
  return {
    ticks,
    entryPrice,
    exitPrice,
    profit: +profit.toFixed(2),
    direction
  };
}

export async function runRealTrade(seed: number, amount: number): Promise<SimulationResult> {
  const realPrice = await getRealPrice();
  const ticks = await simulateRealTicks(seed);
  const direction = mockAISignal(ticks);
  const entryPrice = ticks[0].price;
  const exitPrice = ticks[ticks.length - 1].price;
  let profit: number;
  if (direction === 'BUY') {
    profit = (exitPrice - entryPrice) / entryPrice * amount;
  } else {
    profit = (entryPrice - exitPrice) / entryPrice * amount;
  }
  return {
    ticks,
    entryPrice,
    exitPrice,
    profit: +profit.toFixed(2),
    direction,
    realPrice: realPrice.price,
    priceSource: realPrice.source
  };
}
