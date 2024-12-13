import { Config } from './types';

export interface Config {
    API_URL: string;
    WS_URL: string;
    DEFAULT_PAIR: string;
    TRADING_STRATEGIES: {
        rsi: {
            name: string;
            description: string;
            parameters: {
                period: number;
                overbought: number;
                oversold: number;
                confirmationPeriod: number;
            };
        };
        macd: {
            name: string;
            description: string;
            parameters: {
                fastPeriod: number;
                slowPeriod: number;
                signalPeriod: number;
            };
        };
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

export const CONFIG: Config = {
    API_URL: 'https://api.bitvavo.com/v2',
    WS_URL: 'wss://ws.bitvavo.com/v2',
    DEFAULT_PAIR: 'BTC-EUR',
    TRADING_STRATEGIES: {
        rsi: {
            name: 'RSI Strategy',
            description: 'Relative Strength Index based trading strategy',
            parameters: {
                period: 14,
                overbought: 70,
                oversold: 30,
                confirmationPeriod: 3
            }
        },
        macd: {
            name: 'MACD Strategy',
            description: 'Moving Average Convergence Divergence strategy',
            parameters: {
                fastPeriod: 12,
                slowPeriod: 26,
                signalPeriod: 9
            }
        }
    },
    SAFETY: {
        maxOrderSize: 0.1,
        maxDailyTrades: 10,
        stopLossPercentage: 2,
        takeProfitPercentage: 3,
        maxLeverage: 3,
        maxDrawdown: 10,
        emergencyStopLoss: 15,
        cooldownPeriod: 300,
        minOrderValue: 10
    },
    CHART_COLORS: {
        primary: '#4CAF50',
        secondary: '#2196F3',
        success: '#8BC34A',
        danger: '#F44336',
        warning: '#FFC107'
    }
};
