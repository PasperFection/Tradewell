import { TradeSignal, Candle } from '../types';
import { TradingStrategy } from './TradingStrategy';

export class MACDStrategy implements TradingStrategy {
    private fastPeriod: number;
    private slowPeriod: number;
    private signalPeriod: number;
    private threshold: number;
    private previousMACDHist: number | null = null;

    constructor(
        fastPeriod: number = 12,
        slowPeriod: number = 26,
        signalPeriod: number = 9,
        threshold: number = 0.0002
    ) {
        this.fastPeriod = fastPeriod;
        this.slowPeriod = slowPeriod;
        this.signalPeriod = signalPeriod;
        this.threshold = threshold;
    }

    private calculateEMA(prices: number[], period: number): number[] {
        const multiplier = 2 / (period + 1);
        const ema: number[] = [prices[0]];

        for (let i = 1; i < prices.length; i++) {
            const newEMA = (prices[i] - ema[i - 1]) * multiplier + ema[i - 1];
            ema.push(newEMA);
        }

        return ema;
    }

    private calculateMACD(candles: Candle[]): { macd: number[], signal: number[], histogram: number[] } {
        const prices = candles.map(candle => parseFloat(candle.close));
        
        // Bereken EMA's
        const fastEMA = this.calculateEMA(prices, this.fastPeriod);
        const slowEMA = this.calculateEMA(prices, this.slowPeriod);

        // Bereken MACD lijn
        const macd: number[] = [];
        for (let i = 0; i < prices.length; i++) {
            macd.push(fastEMA[i] - slowEMA[i]);
        }

        // Bereken Signal lijn (EMA van MACD)
        const signal = this.calculateEMA(macd, this.signalPeriod);

        // Bereken MACD histogram
        const histogram: number[] = [];
        for (let i = 0; i < macd.length; i++) {
            histogram.push(macd[i] - signal[i]);
        }

        return { macd, signal, histogram };
    }

    private getConfidence(histogram: number, previousHist: number | null): number {
        if (previousHist === null) return 0;

        const histChange = Math.abs(histogram - previousHist);
        const normalizedChange = Math.min(histChange / this.threshold, 1);
        
        return 0.3 + (normalizedChange * 0.7); // Base confidence of 0.3 plus up to 0.7 based on histogram change
    }

    analyze(candles: Candle[]): TradeSignal {
        if (candles.length < Math.max(this.slowPeriod, this.fastPeriod) + this.signalPeriod) {
            return {
                action: 'hold',
                confidence: 0,
                reason: 'Onvoldoende data voor MACD berekening',
                timestamp: Date.now()
            };
        }

        const { macd, signal, histogram } = this.calculateMACD(candles);
        const currentHist = histogram[histogram.length - 1];
        const currentPrice = parseFloat(candles[candles.length - 1].close);
        const currentVolume = parseFloat(candles[candles.length - 1].volume);

        let action: 'buy' | 'sell' | 'hold' = 'hold';
        let confidence = 0;
        let reason = '';

        // Detecteer crossovers en divergenties
        if (this.previousMACDHist !== null) {
            if (currentHist > this.threshold && this.previousMACDHist <= this.threshold) {
                action = 'buy';
                reason = 'MACD crossover boven threshold';
            } else if (currentHist < -this.threshold && this.previousMACDHist >= -this.threshold) {
                action = 'sell';
                reason = 'MACD crossover onder threshold';
            } else if (currentHist > 0 && this.previousMACDHist > 0) {
                // Bullish momentum continues
                action = 'buy';
                reason = 'Aanhoudend bullish momentum';
            } else if (currentHist < 0 && this.previousMACDHist < 0) {
                // Bearish momentum continues
                action = 'sell';
                reason = 'Aanhoudend bearish momentum';
            }

            if (action !== 'hold') {
                confidence = this.getConfidence(currentHist, this.previousMACDHist);
            }
        }

        this.previousMACDHist = currentHist;

        return {
            action,
            confidence,
            reason: `${reason} (MACD Hist: ${currentHist.toFixed(6)})`,
            price: currentPrice.toString(),
            volume: currentVolume.toString(),
            timestamp: Date.now()
        };
    }

    getName(): string {
        return 'MACD Strategy';
    }

    getDescription(): string {
        return `MACD strategie met periodes ${this.fastPeriod}/${this.slowPeriod}/${this.signalPeriod}`;
    }
}
