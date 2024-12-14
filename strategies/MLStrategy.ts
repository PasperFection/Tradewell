import { TradingStrategyConfig, TradeSignal, Candle } from '../types';
import { RSIStrategy } from './RSIStrategy';
import { MACDStrategy } from './MACDStrategy';
import { VolumeWeightedStrategy } from './advanced';

interface FeatureVector {
    rsi: number;
    macdHistogram: number;
    volumeRatio: number;
    priceChange: number;
    volatility: number;
}

export class MLStrategy {
    private config: TradingStrategyConfig;
    private rsiStrategy: RSIStrategy;
    private macdStrategy: MACDStrategy;
    private volumeStrategy: VolumeWeightedStrategy;
    private featureHistory: FeatureVector[] = [];
    private readonly HISTORY_SIZE = 1000;
    private readonly TRAINING_THRESHOLD = 100;

    constructor() {
        this.config = {
            name: 'Machine Learning Strategy',
            description: 'Combineert meerdere strategieën met machine learning',
            parameters: {
                learningRate: 0.01,
                momentum: 0.9,
                threshold: 0.6
            }
        };

        this.rsiStrategy = new RSIStrategy();
        this.macdStrategy = new MACDStrategy();
        this.volumeStrategy = new VolumeWeightedStrategy();
    }

    private calculateFeatures(candles: Candle[]): FeatureVector {
        // Calculate RSI
        const prices = candles.map(c => parseFloat(c.close));
        const volumes = candles.map(c => parseFloat(c.volume));
        
        // Price changes
        const priceChanges = [];
        for (let i = 1; i < prices.length; i++) {
            priceChanges.push((prices[i] - prices[i-1]) / prices[i-1]);
        }

        // Volume ratio
        const avgVolume = volumes.slice(-10).reduce((a, b) => a + b, 0) / 10;
        const currentVolume = volumes[volumes.length - 1];
        
        // Volatility
        const volatility = Math.sqrt(
            priceChanges.reduce((a, b) => a + b * b, 0) / priceChanges.length
        );

        return {
            rsi: this.calculateRSI(prices),
            macdHistogram: this.calculateMACDHistogram(prices),
            volumeRatio: currentVolume / avgVolume,
            priceChange: priceChanges[priceChanges.length - 1],
            volatility
        };
    }

    private calculateRSI(prices: number[]): number {
        // Simplified RSI calculation
        const gains = [];
        const losses = [];
        
        for (let i = 1; i < prices.length; i++) {
            const diff = prices[i] - prices[i-1];
            gains.push(Math.max(0, diff));
            losses.push(Math.max(0, -diff));
        }

        const avgGain = gains.reduce((a, b) => a + b, 0) / gains.length;
        const avgLoss = losses.reduce((a, b) => a + b, 0) / losses.length;
        
        if (avgLoss === 0) return 100;
        
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    private calculateMACDHistogram(prices: number[]): number {
        // Simplified MACD calculation
        const ema12 = this.calculateEMA(prices, 12);
        const ema26 = this.calculateEMA(prices, 26);
        const macdLine = ema12[ema12.length - 1] - ema26[ema26.length - 1];
        const signalLine = this.calculateEMA([macdLine], 9)[0];
        
        return macdLine - signalLine;
    }

    private calculateEMA(prices: number[], period: number): number[] {
        const k = 2 / (period + 1);
        const ema = [prices[0]];
        
        for (let i = 1; i < prices.length; i++) {
            ema[i] = prices[i] * k + ema[i-1] * (1 - k);
        }
        
        return ema;
    }

    private predictSignal(features: FeatureVector): number {
        if (this.featureHistory.length < this.TRAINING_THRESHOLD) {
            // Not enough data for ML, use traditional signals
            const rsiSignal = features.rsi < 30 ? 1 : features.rsi > 70 ? -1 : 0;
            const macdSignal = features.macdHistogram > 0 ? 1 : -1;
            const volumeSignal = features.volumeRatio > 1.5 ? 1 : features.volumeRatio < 0.5 ? -1 : 0;
            
            return (rsiSignal + macdSignal + volumeSignal) / 3;
        }

        // Simple ensemble learning
        let signal = 0;
        
        // RSI component
        if (features.rsi < 30) signal += 1;
        else if (features.rsi > 70) signal -= 1;
        
        // MACD component
        if (features.macdHistogram > 0) signal += 0.5;
        else signal -= 0.5;
        
        // Volume component
        if (features.volumeRatio > 1.5 && features.priceChange > 0) signal += 0.5;
        else if (features.volumeRatio > 1.5 && features.priceChange < 0) signal -= 0.5;
        
        // Volatility adjustment
        signal *= (1 - features.volatility); // Reduce signal strength in high volatility

        return signal;
    }

    private updateFeatureHistory(features: FeatureVector): void {
        this.featureHistory.push(features);
        if (this.featureHistory.length > this.HISTORY_SIZE) {
            this.featureHistory.shift();
        }
    }

    async analyze(market: string, candles: Candle[]): Promise<TradeSignal> {
        const features = this.calculateFeatures(candles);
        this.updateFeatureHistory(features);
        
        const signal = this.predictSignal(features);
        const confidence = Math.abs(signal);

        if (signal > this.config.parameters.threshold) {
            return {
                action: 'buy',
                reason: 'ML Strategy: Strong buy signal',
                confidence,
                timestamp: Date.now()
            };
        } else if (signal < -this.config.parameters.threshold) {
            return {
                action: 'sell',
                reason: 'ML Strategy: Strong sell signal',
                confidence,
                timestamp: Date.now()
            };
        }

        return {
            action: 'hold',
            reason: 'ML Strategy: No clear signal',
            confidence: 0,
            timestamp: Date.now()
        };
    }
}
