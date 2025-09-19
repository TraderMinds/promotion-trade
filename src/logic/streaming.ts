/// <reference types="@cloudflare/workers-types" />

export interface PriceStreamManager {
  getLatestPrice(): { pair: string; current: { t: number; price: number }; signal: 'BUY' | 'SELL' };
  generatePriceStream(): ReadableStream<Uint8Array>;
}

class LivePriceStreamer implements PriceStreamManager {
  private basePrice = 1000;
  private lastUpdate = Date.now();
  
  getLatestPrice() {
    const now = Date.now();
    const seed = Math.floor(now / 2000); // Update every 2 seconds
    const rand = this.lcg(seed);
    
    // More realistic price movement with momentum
    const timeDiff = now - this.lastUpdate;
    const volatility = 0.5 + (rand() * 0.5); // 0.5-1.0 volatility
    const trend = Math.sin(now / 30000) * 0.3; // 30s cycle trend
    const noise = (rand() - 0.5) * 2 * volatility;
    
    this.basePrice = Math.max(100, this.basePrice + trend + noise);
    this.lastUpdate = now;
    
    const current = { t: now, price: +(this.basePrice.toFixed(2)) };
    const signal = this.generateSmartSignal(current.price);
    
    return { pair: 'XUA/USD', current, signal };
  }
  
  generatePriceStream(): ReadableStream<Uint8Array> {
    let intervalId: any;
    
    return new ReadableStream({
      start(controller) {
        // Send initial price
        const initial = this.getLatestPrice();
        const data = `data: ${JSON.stringify(initial)}\n\n`;
        controller.enqueue(new TextEncoder().encode(data));
        
        // Send updates every 2 seconds
        intervalId = setInterval(() => {
          try {
            const update = this.getLatestPrice();
            const data = `data: ${JSON.stringify(update)}\n\n`;
            controller.enqueue(new TextEncoder().encode(data));
          } catch (error) {
            controller.error(error);
          }
        }, 2000);
      },
      
      cancel() {
        if (intervalId) {
          clearInterval(intervalId);
        }
      }
    });
  }
  
  private lcg(seed: number) {
    let state = seed >>> 0;
    return () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0xffffffff;
    };
  }
  
  private generateSmartSignal(currentPrice: number): 'BUY' | 'SELL' {
    // Simple technical analysis simulation
    const shortMA = this.basePrice * 0.98; // Simulated short moving average
    const longMA = this.basePrice * 1.02;  // Simulated long moving average
    const rsi = (currentPrice / this.basePrice - 1) * 100 + 50; // Simplified RSI
    
    // Buy when price above short MA and RSI not overbought
    if (currentPrice > shortMA && rsi < 70) {
      return 'BUY';
    }
    // Sell when price below long MA or RSI overbought
    return 'SELL';
  }
}

export const priceStreamer = new LivePriceStreamer();