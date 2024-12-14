import { TradingStrategy } from './TradingStrategy';
import { RSIStrategy } from './RSIStrategy';
import { CONFIG } from '../config';

export class StrategyFactory {
    private static strategies: Map<string, TradingStrategy> = new Map();

    static initialize(): void {
        // RSI Strategy
        const rsiConfig = CONFIG.TRADING_STRATEGIES.rsi.parameters;
        this.strategies.set('rsi', new RSIStrategy(
            rsiConfig.period,
            rsiConfig.oversold,
            rsiConfig.overbought,
            rsiConfig.confirmationPeriod
        ));

        // Andere strategieën kunnen hier worden toegevoegd
    }

    static getStrategy(name: string): TradingStrategy {
        const strategy = this.strategies.get(name.toLowerCase());
        if (!strategy) {
            throw new Error(`Trading strategie '${name}' niet gevonden`);
        }
        return strategy;
    }

    static getAllStrategies(): TradingStrategy[] {
        return Array.from(this.strategies.values());
    }

    static getAvailableStrategyNames(): string[] {
        return Array.from(this.strategies.keys());
    }
}
