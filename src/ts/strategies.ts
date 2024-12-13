import { TradingStrategyConfig, TradeSignal, Candle } from './types';
import { CONFIG } from './config';

abstract class TradingStrategy {
    protected config: TradingStrategyConfig;

    constructor(config: TradingStrategyConfig) {
        this.config = config;
    }

    abstract analyze(market: string, candles: Candle[]): Promise<TradeSignal>;
}

export class TrendFollowingStrategy extends TradingStrategy {
    constructor(config: TradingStrategyConfig = CONFIG.TRADING_STRATEGIES.trend) {
        super(config);
    }

    private calculateEMA(prices: number[], period: number): number {
        const k = 2 / (period + 1);
        let ema = prices[0];
        
        for (let i = 1; i < prices.length; i++) {
            ema = prices[i] * k + ema * (1 - k);
        }
        
        return ema;
    }

    async analyze(market: string, candles: Candle[]): Promise<TradeSignal> {
        const closePrices = candles.map(candle => parseFloat(candle.close));
        const shortEMA = this.calculateEMA(closePrices, this.config.parameters.trendPeriod);
        const longEMA = this.calculateEMA(closePrices, this.config.parameters.trendPeriod * 2);
        
        const currentPrice = closePrices[closePrices.length - 1];
        const priceChange = (currentPrice - shortEMA) / shortEMA;

        if (priceChange > this.config.parameters.buyThreshold) {
            return {
                action: 'buy',
                reason: 'Positieve trend gedetecteerd',
                confidence: Math.min(priceChange * 5, 1),
                timestamp: Date.now()
            };
        } else if (priceChange < this.config.parameters.sellThreshold) {
            return {
                action: 'sell',
                reason: 'Negatieve trend gedetecteerd',
                confidence: Math.min(Math.abs(priceChange) * 5, 1),
                timestamp: Date.now()
            };
        }

        return {
            action: 'hold',
            reason: 'Geen duidelijke trend',
            confidence: 0,
            timestamp: Date.now()
        };
    }
}

export class MeanReversionStrategy extends TradingStrategy {
    constructor(config: TradingStrategyConfig = CONFIG.TRADING_STRATEGIES.meanReversion) {
        super(config);
    }

    private calculateBollingerBands(prices: number[], period: number = 20, deviations: number = 2) {
        const sma = prices.slice(-period).reduce((a, b) => a + b) / period;
        const squaredDiffs = prices.slice(-period).map(price => Math.pow(price - sma, 2));
        const standardDeviation = Math.sqrt(squaredDiffs.reduce((a, b) => a + b) / period);
        
        return {
            middle: sma,
            upper: sma + (standardDeviation * deviations),
            lower: sma - (standardDeviation * deviations)
        };
    }

    async analyze(market: string, candles: Candle[]): Promise<TradeSignal> {
        const closePrices = candles.map(candle => parseFloat(candle.close));
        const currentPrice = closePrices[closePrices.length - 1];
        const bands = this.calculateBollingerBands(
            closePrices,
            this.config.parameters.period,
            this.config.parameters.deviationThreshold
        );

        if (currentPrice < bands.lower) {
            return {
                action: 'buy',
                reason: 'Prijs onder onderste Bollinger Band',
                confidence: Math.min((bands.lower - currentPrice) / bands.lower, 1),
                timestamp: Date.now()
            };
        } else if (currentPrice > bands.upper) {
            return {
                action: 'sell',
                reason: 'Prijs boven bovenste Bollinger Band',
                confidence: Math.min((currentPrice - bands.upper) / bands.upper, 1),
                timestamp: Date.now()
            };
        }

        return {
            action: 'hold',
            reason: 'Prijs binnen normale grenzen',
            confidence: 0,
            timestamp: Date.now()
        };
    }
}

// Factory voor het maken van strategie-instanties
export class StrategyFactory {
    static create(type: string): TradingStrategy {
        switch (type) {
            case 'trend':
                return new TrendFollowingStrategy();
            case 'meanReversion':
                return new MeanReversionStrategy();
            default:
                throw new Error(`Onbekende strategie: ${type}`);
        }
    }
}
