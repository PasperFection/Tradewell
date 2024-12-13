export type TradeAction = 'buy' | 'sell' | 'hold';

export interface TradeSignal {
    action: TradeAction;
    reason: string;
    confidence: number;
    timestamp: number;
}

export interface TradingStrategyConfig {
    name: string;
    description: string;
    parameters: Record<string, number>;
}

export interface Config {
    API_URL: string;
    WS_URL: string;
    DEFAULT_PAIR: string;
    TRADING_STRATEGIES: {
        rsi: TradingStrategyConfig;
        macd: TradingStrategyConfig;
    };
    SAFETY: {
        maxOrderSize: number;
        maxDailyTrades: number;
        stopLossPercentage: number;
        takeProfitPercentage: number;
        maxLeverage: number;
        maxDrawdown: number;
        emergencyStopLoss: number;
        cooldownPeriod: number;
        minOrderValue: number;
    };
    CHART_COLORS: {
        primary: string;
        secondary: string;
        success: string;
        danger: string;
        warning: string;
    };
}

export interface Trade {
    id: string;
    timestamp: number;
    price: number;
    amount: number;
    side: 'buy' | 'sell';
    market: string;
}

export interface Order {
    id: string;
    timestamp: number;
    market: string;
    side: 'buy' | 'sell';
    type: 'limit' | 'market';
    amount?: number;
    price?: number;
    status: 'new' | 'filled' | 'cancelled' | 'rejected';
}

export interface BitvavoAPI {
    placeOrder(market: string, side: 'buy' | 'sell', amount: number, price?: number): Promise<Order>;
    getBalance(symbol: string): Promise<{ available: number; inOrder: number }>;
    getTicker(market: string): Promise<{ lastPrice: number; volume: number }>;
    getTrades(market: string, limit?: number): Promise<Trade[]>;
    getCandles(market: string, interval: string, limit?: number): Promise<[number, number, number, number, number, number][]>;
}

export interface ApiCredentials {
    apiKey: string;
    apiSecret: string;
}

export interface Balance {
    symbol: string;
    available: string;
    inOrder: string;
}

export interface Candle {
    timestamp: number;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
}

export interface WebSocketMessage {
    event: string;
    market?: string;
    price?: string;
    data?: any;
    timestamp?: number;
    [key: string]: any;
}

export interface StatusMessage {
    message: string;
    type: 'info' | 'error' | 'success' | 'warning';
    timestamp: number;
    details?: string;
}

export interface UserSettings {
    notifications: boolean;
    autoTrade: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    theme: 'light' | 'dark' | 'system';
    defaultPair: string;
    tradingEnabled: boolean;
    maxOrderSize: number;
    stopLossEnabled: boolean;
    stopLossPercentage: number;
    takeProfitEnabled: boolean;
    takeProfitPercentage: number;
}

export interface OrderFill {
    id: string;
    timestamp: number;
    amount: string;
    price: string;
    taker: boolean;
    fee: string;
    feeCurrency: string;
}

export interface SecurityConfig {
    API_RATE_LIMIT: number;
    API_TIMEOUT: number;
    MAX_RETRY_ATTEMPTS: number;
    WS_HEARTBEAT_INTERVAL: number;
    WS_RECONNECT_DELAY: number;
    WS_MAX_RECONNECT_ATTEMPTS: number;
    INPUT_VALIDATION: {
        PAIR_REGEX: RegExp;
        MAX_ORDER_SIZE_BTC: number;
        MIN_ORDER_SIZE_EUR: number;
        PRICE_DECIMALS: number;
    };
    CONTENT_SECURITY: {
        ALLOWED_DOMAINS: string[];
        SANITIZE_OPTIONS: {
            ALLOWED_TAGS: string[];
            ALLOWED_ATTR: string[];
        };
    };
    STORAGE: {
        ENCRYPTION_ALGORITHM: string;
        KEY_LENGTH: number;
        SALT_LENGTH: number;
        IV_LENGTH: number;
    };
}

export class ApiError extends Error {
    constructor(
        public statusCode: number,
        public message: string,
        public endpoint: string
    ) {
        super(message);
        this.name = 'ApiError';
    }
}
