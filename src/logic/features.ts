// Advanced features for the trading bot
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (stats: UserStats) => boolean;
  reward: number; // Bonus balance
}

export interface UserStats {
  totalTrades: number;
  totalProfit: number;
  winStreak: number;
  maxWinStreak: number;
  biggestWin: number;
  biggestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  profitableDays: number;
  totalDays: number;
  averageReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

export interface LeaderboardEntry {
  userId: number;
  username: string;
  totalProfit: number;
  winRate: number;
  totalTrades: number;
  rank: number;
}

export interface PortfolioMetrics {
  totalValue: number;
  totalReturn: number;
  dailyReturn: number;
  weeklyReturn: number;
  monthlyReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
}

// Achievement definitions
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_trade',
    name: 'First Steps',
    description: 'Complete your first trade',
    icon: '🎯',
    condition: (stats) => stats.totalTrades >= 1,
    reward: 50
  },
  {
    id: 'profitable_trader',
    name: 'Profitable Trader',
    description: 'Achieve positive total profit',
    icon: '💰',
    condition: (stats) => stats.totalProfit > 0,
    reward: 100
  },
  {
    id: 'win_streak_5',
    name: 'Hot Streak',
    description: 'Win 5 trades in a row',
    icon: '🔥',
    condition: (stats) => stats.maxWinStreak >= 5,
    reward: 200
  },
  {
    id: 'win_streak_10',
    name: 'Legendary Trader',
    description: 'Win 10 trades in a row',
    icon: '👑',
    condition: (stats) => stats.maxWinStreak >= 10,
    reward: 500
  },
  {
    id: 'big_winner',
    name: 'Big Winner',
    description: 'Win more than $500 in a single trade',
    icon: '💎',
    condition: (stats) => stats.biggestWin >= 500,
    reward: 250
  },
  {
    id: 'volume_trader',
    name: 'Volume Trader',
    description: 'Complete 100 trades',
    icon: '📈',
    condition: (stats) => stats.totalTrades >= 100,
    reward: 1000
  },
  {
    id: 'consistent_trader',
    name: 'Consistent Trader',
    description: 'Maintain 70% win rate over 20+ trades',
    icon: '🎪',
    condition: (stats) => stats.totalTrades >= 20 && (stats.consecutiveWins / stats.totalTrades) >= 0.7,
    reward: 750
  },
  {
    id: 'risk_manager',
    name: 'Risk Manager',
    description: 'Keep max drawdown under 5%',
    icon: '🛡️',
    condition: (stats) => stats.totalTrades >= 10 && stats.maxDrawdown < 0.05,
    reward: 300
  }
];

// Calculate user statistics
export function calculateUserStats(trades: any[]): UserStats {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      totalProfit: 0,
      winStreak: 0,
      maxWinStreak: 0,
      biggestWin: 0,
      biggestLoss: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      profitableDays: 0,
      totalDays: 0,
      averageReturn: 0,
      sharpeRatio: 0,
      maxDrawdown: 0
    };
  }

  let winStreak = 0;
  let maxWinStreak = 0;
  let consecutiveWins = 0;
  let consecutiveLosses = 0;
  let currentStreak = 0;
  let biggestWin = 0;
  let biggestLoss = 0;
  let totalProfit = 0;
  
  const returns: number[] = [];
  const dailyProfits = new Map<string, number>();

  trades.forEach((trade, index) => {
    const profit = trade.profit || 0;
    totalProfit += profit;
    returns.push(profit);
    
    // Track daily profits
    const date = new Date(trade.ts).toDateString();
    dailyProfits.set(date, (dailyProfits.get(date) || 0) + profit);
    
    // Track biggest wins/losses
    if (profit > biggestWin) biggestWin = profit;
    if (profit < biggestLoss) biggestLoss = profit;
    
    // Track streaks
    if (profit > 0) {
      consecutiveWins++;
      consecutiveLosses = 0;
      currentStreak++;
      if (currentStreak > maxWinStreak) maxWinStreak = currentStreak;
    } else {
      consecutiveLosses++;
      consecutiveWins = 0;
      currentStreak = 0;
    }
  });

  // Calculate profitable days
  const profitableDays = Array.from(dailyProfits.values()).filter(p => p > 0).length;
  const totalDays = dailyProfits.size;

  // Calculate average return
  const averageReturn = returns.length > 0 ? totalProfit / returns.length : 0;

  // Calculate Sharpe ratio (simplified)
  const returnVariance = returns.reduce((sum, r) => sum + Math.pow(r - averageReturn, 2), 0) / returns.length;
  const volatility = Math.sqrt(returnVariance);
  const sharpeRatio = volatility > 0 ? averageReturn / volatility : 0;

  // Calculate max drawdown
  let peak = 0;
  let maxDrawdown = 0;
  let runningTotal = 0;
  
  trades.forEach(trade => {
    runningTotal += trade.profit || 0;
    if (runningTotal > peak) peak = runningTotal;
    const drawdown = (peak - runningTotal) / Math.max(peak, 1);
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  });

  return {
    totalTrades: trades.length,
    totalProfit,
    winStreak: currentStreak,
    maxWinStreak,
    biggestWin,
    biggestLoss,
    consecutiveWins,
    consecutiveLosses,
    profitableDays,
    totalDays,
    averageReturn,
    sharpeRatio,
    maxDrawdown
  };
}

// Check for new achievements
export function checkAchievements(stats: UserStats, currentAchievements: string[] = []): Achievement[] {
  const newAchievements: Achievement[] = [];
  
  ACHIEVEMENTS.forEach(achievement => {
    if (!currentAchievements.includes(achievement.id) && achievement.condition(stats)) {
      newAchievements.push(achievement);
    }
  });
  
  return newAchievements;
}

// Calculate portfolio metrics
export function calculatePortfolioMetrics(trades: any[], initialBalance: number = 10000): PortfolioMetrics {
  if (trades.length === 0) {
    return {
      totalValue: initialBalance,
      totalReturn: 0,
      dailyReturn: 0,
      weeklyReturn: 0,
      monthlyReturn: 0,
      volatility: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      winRate: 0,
      profitFactor: 0
    };
  }

  const stats = calculateUserStats(trades);
  const totalProfit = stats.totalProfit;
  const totalValue = initialBalance + totalProfit;
  const totalReturn = totalProfit / initialBalance;

  // Calculate time-based returns
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

  const dailyTrades = trades.filter(t => t.ts >= oneDayAgo);
  const weeklyTrades = trades.filter(t => t.ts >= oneWeekAgo);
  const monthlyTrades = trades.filter(t => t.ts >= oneMonthAgo);

  const dailyReturn = dailyTrades.reduce((sum, t) => sum + (t.profit || 0), 0) / initialBalance;
  const weeklyReturn = weeklyTrades.reduce((sum, t) => sum + (t.profit || 0), 0) / initialBalance;
  const monthlyReturn = monthlyTrades.reduce((sum, t) => sum + (t.profit || 0), 0) / initialBalance;

  // Calculate win rate
  const wins = trades.filter(t => (t.profit || 0) > 0).length;
  const winRate = trades.length > 0 ? wins / trades.length : 0;

  // Calculate profit factor
  const grossProfit = trades.filter(t => (t.profit || 0) > 0).reduce((sum, t) => sum + t.profit, 0);
  const grossLoss = Math.abs(trades.filter(t => (t.profit || 0) < 0).reduce((sum, t) => sum + t.profit, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;

  // Calculate volatility (annualized)
  const returns = trades.map(t => (t.profit || 0) / initialBalance);
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance * 252); // Annualized (assuming 252 trading days)

  return {
    totalValue,
    totalReturn,
    dailyReturn,
    weeklyReturn,
    monthlyReturn,
    volatility,
    sharpeRatio: stats.sharpeRatio,
    maxDrawdown: stats.maxDrawdown,
    winRate,
    profitFactor
  };
}

// Generate leaderboard
export function generateLeaderboard(allUsers: Map<number, any>): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = [];
  
  allUsers.forEach((userData, userId) => {
    const stats = calculateUserStats(userData.trades || []);
    const winRate = stats.totalTrades > 0 ? (stats.consecutiveWins / stats.totalTrades) : 0;
    
    entries.push({
      userId,
      username: userData.username || `User${userId}`,
      totalProfit: stats.totalProfit,
      winRate,
      totalTrades: stats.totalTrades,
      rank: 0 // Will be set after sorting
    });
  });
  
  // Sort by total profit descending
  entries.sort((a, b) => b.totalProfit - a.totalProfit);
  
  // Assign ranks
  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });
  
  return entries.slice(0, 100); // Top 100
}