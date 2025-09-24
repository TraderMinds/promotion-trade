// Domain type definitions for TradeX Pro
// These interfaces formalize user and trading-related data persisted in KV.

export interface User {
  id: number | string;
  firstName: string;
  lastName?: string;
  username?: string | null;
  languageCode?: string;
  balance: number; // virtual USD balance
  registered: boolean;
  createdAt: string; // ISO string
  positions?: Position[];
  tradeHistory?: TradeRecord[];
  transactions?: Transaction[];
  totalTrades?: number;
  winRate?: number; // percentage 0-100
}

export interface Position {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number; // USD notionally committed
  entryPrice: number;
  openedAt: string;
  closedAt?: string;
  exitPrice?: number;
  pnl?: number; // realized PnL in USD
  ticks?: number; // number of ticks simulated
}

export interface TradeRecord {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  startedAt: string;
  finishedAt: string;
  entryPrice: number;
  exitPrice: number;
  pnlPct: number; // percent change
  pnlUsd: number; // USD delta applied to balance
  ticks: number;
}

export interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'ADJUSTMENT' | 'TRADE_PNL';
  amount: number; // positive for credit, negative for debit
  createdAt: string;
  meta?: Record<string, unknown>;
}

export interface AISignal {
  id: string | number;
  crypto: string;
  action: 'BUY' | 'SELL';
  reason: string;
  timestamp: string | Date;
  price: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  requestId: string;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
  requestId: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
