import { TradeSignal, Candle } from '../types';
import { TradingStrategy } from './TradingStrategy';

export class RSIStrategy implements TradingStrategy {
    private rsiValues: number[] = [];
    private period: number;
    private oversold: number;
    private overbought: number;
    private confirmationPeriod: number;
    private lastSignal: 'buy' | 'sell' | null = null;
    private confirmationCount: number = 0;

    constructor(
        period: number = 14,
        oversold: number = 30,
        overbought: number = 70,
        confirmationPeriod: number = 3
    ) {
        this.period = period;
        this.oversold = oversold;
        this.overbought = overbought;
        this.confirmationPeriod = confirmationPeriod;
    }

    private calculateGainsLosses(candles: Candle[]): { gains: number[], losses: number[] } {
        const gains: number[] = [];
        const losses: number[] = [];

        for (let i = 1; i < candles.length; i++) {
            const previousClose = parseFloat(candles[i - 1].close);
            const currentClose = parseFloat(candles[i].close);
            const change = currentClose - previousClose;

            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? Math.abs(change) : 0);
        }

        return { gains, losses };
    }

    private calculateRSI(candles: Candle[]): number {
        if (candles.length <= this.period) {
            return 50; // Neutrale waarde als er onvoldoende data is
        }

        const { gains, losses } = this.calculateGainsLosses(candles);

        // Bereken eerste gemiddelde gains/losses
        let avgGain = gains.slice(0, this.period).reduce((sum, gain) => sum + gain, 0) / this.period;
        let avgLoss = losses.slice(0, this.period).reduce((sum, loss) => sum + loss, 0) / this.period;

        // Bereken smoothed averages voor de rest van de periode
        for (let i = this.period; i < gains.length; i++) {
            avgGain = ((avgGain * (this.period - 1)) + gains[i]) / this.period;
            avgLoss = ((avgLoss * (this.period - 1)) + losses[i]) / this.period;
        }

        const rs = avgGain / (avgLoss || 1); // Voorkom delen door nul
        return 100 - (100 / (1 + rs));
    }

    private getConfidence(rsi: number): number {
        if (rsi <= this.oversold) {
            return Math.min(1, (this.oversold - rsi) / 10) * 0.8 + 0.2;
        } else if (rsi >= this.overbought) {
            return Math.min(1, (rsi - this.overbought) / 10) * 0.8 + 0.2;
        }
        return 0;
    }

    analyze(candles: Candle[]): TradeSignal {
        const currentRSI = this.calculateRSI(candles);
        this.rsiValues.push(currentRSI);

        // Houd alleen de laatste periode + confirmationPeriod waarden bij
        if (this.rsiValues.length > this.period + this.confirmationPeriod) {
            this.rsiValues.shift();
        }

        let signal: 'buy' | 'sell' | 'hold' = 'hold';
        let confidence = 0;

        // Check voor oversold/overbought condities
        if (currentRSI <= this.oversold) {
            if (this.lastSignal !== 'buy') {
                this.confirmationCount = 1;
                this.lastSignal = 'buy';
            } else {
                this.confirmationCount++;
            }
        } else if (currentRSI >= this.overbought) {
            if (this.lastSignal !== 'sell') {
                this.confirmationCount = 1;
                this.lastSignal = 'sell';
            } else {
                this.confirmationCount++;
            }
        } else {
            this.confirmationCount = 0;
            this.lastSignal = null;
        }

        // Genereer signaal alleen als we voldoende bevestiging hebben
        if (this.confirmationCount >= this.confirmationPeriod) {
            signal = this.lastSignal || 'hold';
            confidence = this.getConfidence(currentRSI);
        }

        const currentPrice = parseFloat(candles[candles.length - 1].close);
        const volume = parseFloat(candles[candles.length - 1].volume);

        return {
            action: signal,
            confidence,
            reason: `RSI ${currentRSI.toFixed(2)} - ${signal.toUpperCase()} signaal met ${(confidence * 100).toFixed(1)}% zekerheid`,
            price: currentPrice.toString(),
            volume: volume.toString(),
            timestamp: Date.now()
        };
    }

    getName(): string {
        return 'RSI Strategy';
    }

    getDescription(): string {
        return `RSI strategie met periode ${this.period}, oversold ${this.oversold}, overbought ${this.overbought}`;
    }
}
