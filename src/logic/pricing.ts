export interface TickData {
  t: number; // epoch ms
  price: number;
}

export interface SimulationResult {
  ticks: TickData[];
  entryPrice: number;
  exitPrice: number;
  profit: number; // in quote currency
  direction: 'BUY' | 'SELL';
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
    out.push({ t: Date.now() + i * 1000, price: +(p.toFixed(2)) });
  }
  return out;
}

export function mockAISignal(ticks: TickData[]) {
  if (ticks.length < 2) return 'BUY' as const;
  
  // Enhanced AI logic with technical indicators
  const prices = ticks.map(t => t.price);
  const latest = prices[prices.length - 1];
  const sma5 = prices.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, prices.length);
  const sma10 = prices.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, prices.length);
  
  // Calculate momentum
  const momentum = prices.length >= 3 ? 
    (latest - prices[prices.length - 3]) / prices[prices.length - 3] : 0;
  
  // Calculate volatility
  const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
  const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length);
  
  // Enhanced signal logic
  if (latest > sma5 && sma5 > sma10 && momentum > 0.001 && volatility < 0.02) {
    return 'BUY';
  }
  if (latest < sma5 && sma5 < sma10 && momentum < -0.001) {
    return 'SELL';
  }
  
  // Default to trend following
  return latest >= ticks[0].price ? 'BUY' : 'SELL';
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
