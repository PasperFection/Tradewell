// API Types
export interface BitvavoAPI {
  getBalance(symbol: string): Promise<{ available: number; inOrder: number }>;
  getTicker(market: string): Promise<{ lastPrice: number; volume: number }>;
  placeOrder(market: string, side: 'buy' | 'sell', amount: number, price?: number): Promise<Order>;
  getTrades(market: string): Promise<Trade[]>;
}

export interface Order {
  orderId: string;
  market: string;
  side: 'buy' | 'sell';
  orderType: 'limit' | 'market';
  amount: number;
  price: number;
  status: 'new' | 'filled' | 'cancelled';
  filledAmount: number;
  amountQuote?: number;
  feePaid?: number;
  created: number;
  updated: number;
}

export interface Trade {
  id: string;
  timestamp: number;
  amount: number;
  price: number;
  side: 'buy' | 'sell';
}

export interface Balance {
  symbol: string;
  available: number;
  inOrder: number;
}

// Strategy Types
export interface TradingStrategy {
  name: string;
  analyze(data: any): Promise<TradeSignal>;
  getConfig(): TradingStrategyConfig;
  updateConfig(config: Partial<TradingStrategyConfig>): void;
}

export interface TradeSignal {
  action: TradeAction;
  price?: number;
  confidence: number;
  timestamp: number;
}

export type TradeAction = 'buy' | 'sell' | 'hold';

export interface TradingStrategyConfig {
  enabled: boolean;
  interval: number;
  market: string;
  riskLevel: number;
  params: Record<string, any>;
}

// Performance Types
export interface PerformanceMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalProfitLoss: number;
  winRate: number;
  averageReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

export interface BacktestResult {
  trades: Order[];
  metrics: PerformanceMetrics;
  equity: number[];
  drawdowns: number[];
}

// Portfolio Types
export interface PortfolioMetrics {
  totalValue: number;
  allocation: Record<string, number>;
  risk: number;
  diversification: number;
}

// Config Type
export interface Config {
  API_KEY: string;
  API_SECRET: string;
  STORAGE_KEY: string;
  SAFETY: {
    maxOrderSize: number;
    maxDailyTrades: number;
    stopLossPercentage: number;
    takeProfitPercentage: number;
  };
  STRATEGIES: Record<string, TradingStrategyConfig>;
}

// Chart Types
export interface ChartConfig {
  type: string;
  data: any;
  options: any;
}

declare global {
  interface Window {
    TradingView: any;
    Chart: any;
  }
}
