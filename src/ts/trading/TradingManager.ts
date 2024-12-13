import { Config, TradeSignal, Order, Trade, BitvavoAPI, Balance } from '../types';
import { bitvavo } from '../api';
import { RiskManager } from '../risk/RiskManager';
import { CONFIG } from '../config';

export class TradingManager {
    private lastTradeTime: number = 0;
    private dailyTradeCount: number = 0;
    private lastSignal: TradeSignal | null = null;

    constructor(
        private api: BitvavoAPI = bitvavo,
        private riskManager: RiskManager,
        private config: Config = CONFIG,
        private settings: {
            maxOrderSize: number;
            maxDailyTrades: number;
            stopLossPercentage: number;
            takeProfitPercentage: number;
        }
    ) {}

    async updateCandle(data: any): Promise<void> {
        // Process new candle data
        // This could trigger strategy evaluations
        console.log('Received new candle:', data);
        // Implement candle processing logic
    }

    async updateTrade(data: any): Promise<void> {
        // Process new trade data
        console.log('Received new trade:', data);
        // Implement trade processing logic
    }

    async updateTicker(data: any): Promise<void> {
        // Process new ticker data
        console.log('Received new ticker:', data);
        // Implement ticker processing logic
    }

    private async processTradeSignal(signal: TradeSignal): Promise<void> {
        const now = Date.now();
        const cooldownPeriod = this.config.SAFETY.cooldownPeriod * 1000; // Convert to milliseconds

        // Check if we're still in cooldown period
        if (now - this.lastTradeTime < cooldownPeriod) {
            console.log('In cooldown period, skipping signal');
            return;
        }

        // Check daily trade limit
        if (this.dailyTradeCount >= this.config.SAFETY.maxDailyTrades) {
            console.log('Daily trade limit reached');
            return;
        }

        // Get current balance and price
        const balances = await this.api.getBalance('EUR');
        const balance = balances[0];
        const ticker = await this.api.getTicker(this.config.DEFAULT_PAIR);

        // Check minimum order value
        const availableBalance = parseFloat(balance.available);
        const potentialOrderValue = availableBalance * 0.1; // Use 10% of available balance
        if (potentialOrderValue < this.config.SAFETY.minOrderValue) {
            console.log('Order value too small');
            return;
        }

        // Execute trade based on signal
        if (signal.action === 'buy' || signal.action === 'sell') {
            try {
                const amount = (potentialOrderValue / parseFloat(ticker.last)).toFixed(8);
                const order = await this.api.placeOrder(
                    this.config.DEFAULT_PAIR,
                    signal.action,
                    amount
                );

                this.lastTradeTime = now;
                this.dailyTradeCount++;
                this.lastSignal = signal;

                console.log(`Order placed: ${JSON.stringify(order)}`);
            } catch (error) {
                console.error('Error placing order:', error);
            }
        }
    }

    resetDailyTradeCount(): void {
        this.dailyTradeCount = 0;
    }

    getLastSignal(): TradeSignal | null {
        return this.lastSignal;
    }
}
