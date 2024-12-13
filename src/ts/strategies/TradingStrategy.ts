import { TradeSignal, Candle } from '../types';

export interface TradingStrategy {
    analyze(candles: Candle[]): TradeSignal;
    getName(): string;
    getDescription(): string;
}
