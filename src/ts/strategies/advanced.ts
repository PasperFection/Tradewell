import { TradingStrategyConfig, TradeSignal, Candle } from '../types';
import { CONFIG } from '../config';

export class RSIStrategy {
    private config: TradingStrategyConfig;

    constructor() {
        this.config = {
            name: 'RSI Strategy',
            description: 'Handelt op basis van Relative Strength Index',
            parameters: {
                period: 14,
                overboughtLevel: 70,
                oversoldLevel: 30
            }
        };
    }

    private calculateRSI(prices: number[]): number {
        let gains = 0;
        let losses = 0;

        for (let i = 1; i < prices.length; i++) {
            const difference = prices[i] - prices[i - 1];
            if (difference >= 0) {
                gains += difference;
            } else {
                losses -= difference;
            }
        }

        const avgGain = gains / this.config.parameters.period;
        const avgLoss = losses / this.config.parameters.period;
        
        if (avgLoss === 0) {
            return 100;
        }
        
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    async analyze(market: string, candles: Candle[]): Promise<TradeSignal> {
        const prices = candles.map(candle => parseFloat(candle.close));
        const rsi = this.calculateRSI(prices);

        if (rsi < this.config.parameters.oversoldLevel) {
            return {
                action: 'buy',
                reason: `RSI oversold (${rsi.toFixed(2)})`,
                confidence: (this.config.parameters.oversoldLevel - rsi) / this.config.parameters.oversoldLevel,
                timestamp: Date.now()
            };
        } else if (rsi > this.config.parameters.overboughtLevel) {
            return {
                action: 'sell',
                reason: `RSI overbought (${rsi.toFixed(2)})`,
                confidence: (rsi - this.config.parameters.overboughtLevel) / (100 - this.config.parameters.overboughtLevel),
                timestamp: Date.now()
            };
        }

        return {
            action: 'hold',
            reason: `RSI neutraal (${rsi.toFixed(2)})`,
            confidence: 0,
            timestamp: Date.now()
        };
    }
}

export class MACDStrategy {
    private config: TradingStrategyConfig;

    constructor() {
        this.config = {
            name: 'MACD Strategy',
            description: 'Moving Average Convergence Divergence strategie',
            parameters: {
                fastPeriod: 12,
                slowPeriod: 26,
                signalPeriod: 9
            }
        };
    }

    private calculateEMA(prices: number[], period: number): number[] {
        const k = 2 / (period + 1);
        const ema = [prices[0]];

        for (let i = 1; i < prices.length; i++) {
            ema[i] = prices[i] * k + ema[i - 1] * (1 - k);
        }

        return ema;
    }

    private calculateMACD(prices: number[]): {
        macd: number[];
        signal: number[];
        histogram: number[];
    } {
        const fastEMA = this.calculateEMA(prices, this.config.parameters.fastPeriod);
        const slowEMA = this.calculateEMA(prices, this.config.parameters.slowPeriod);
        
        const macd = fastEMA.map((fast, i) => fast - slowEMA[i]);
        const signal = this.calculateEMA(macd, this.config.parameters.signalPeriod);
        const histogram = macd.map((value, i) => value - signal[i]);

        return { macd, signal, histogram };
    }

    async analyze(market: string, candles: Candle[]): Promise<TradeSignal> {
        const prices = candles.map(candle => parseFloat(candle.close));
        const { macd, signal, histogram } = this.calculateMACD(prices);

        const currentHistogram = histogram[histogram.length - 1];
        const previousHistogram = histogram[histogram.length - 2];

        if (currentHistogram > 0 && previousHistogram <= 0) {
            return {
                action: 'buy',
                reason: 'MACD kruist signaal lijn naar boven',
                confidence: Math.min(Math.abs(currentHistogram) / macd[macd.length - 1], 1),
                timestamp: Date.now()
            };
        } else if (currentHistogram < 0 && previousHistogram >= 0) {
            return {
                action: 'sell',
                reason: 'MACD kruist signaal lijn naar beneden',
                confidence: Math.min(Math.abs(currentHistogram) / macd[macd.length - 1], 1),
                timestamp: Date.now()
            };
        }

        return {
            action: 'hold',
            reason: 'Geen MACD signaal',
            confidence: 0,
            timestamp: Date.now()
        };
    }
}

export class VolumeWeightedStrategy {
    private config: TradingStrategyConfig;

    constructor() {
        this.config = {
            name: 'Volume Weighted Strategy',
            description: 'Handelt op basis van volume en prijsactie',
            parameters: {
                volumeThreshold: 1.5,
                priceChangeThreshold: 0.02
            }
        };
    }

    private calculateVWAP(candles: Candle[]): number {
        let cumulativeTPV = 0;
        let cumulativeVolume = 0;

        for (const candle of candles) {
            const typicalPrice = (parseFloat(candle.high) + parseFloat(candle.low) + parseFloat(candle.close)) / 3;
            const volume = parseFloat(candle.volume);
            
            cumulativeTPV += typicalPrice * volume;
            cumulativeVolume += volume;
        }

        return cumulativeTPV / cumulativeVolume;
    }

    async analyze(market: string, candles: Candle[]): Promise<TradeSignal> {
        const vwap = this.calculateVWAP(candles);
        const currentPrice = parseFloat(candles[candles.length - 1].close);
        const currentVolume = parseFloat(candles[candles.length - 1].volume);
        
        const averageVolume = candles
            .slice(-10)
            .reduce((sum, candle) => sum + parseFloat(candle.volume), 0) / 10;

        const volumeRatio = currentVolume / averageVolume;
        const priceDeviation = (currentPrice - vwap) / vwap;

        if (volumeRatio > this.config.parameters.volumeThreshold && 
            priceDeviation > this.config.parameters.priceChangeThreshold) {
            return {
                action: 'buy',
                reason: `Hoog volume (${volumeRatio.toFixed(2)}x) met positieve prijsactie`,
                confidence: Math.min(volumeRatio / this.config.parameters.volumeThreshold, 1),
                timestamp: Date.now()
            };
        } else if (volumeRatio > this.config.parameters.volumeThreshold && 
                   priceDeviation < -this.config.parameters.priceChangeThreshold) {
            return {
                action: 'sell',
                reason: `Hoog volume (${volumeRatio.toFixed(2)}x) met negatieve prijsactie`,
                confidence: Math.min(volumeRatio / this.config.parameters.volumeThreshold, 1),
                timestamp: Date.now()
            };
        }

        return {
            action: 'hold',
            reason: 'Onvoldoende volume of prijsactie',
            confidence: 0,
            timestamp: Date.now()
        };
    }
}
