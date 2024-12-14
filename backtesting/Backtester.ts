import { Candle, Order, TradeSignal } from '../types';
import { TradingStrategy } from '../strategies/TradingStrategy';
import { PerformanceMonitor } from '../performance/PerformanceMonitor';
import { RiskManager } from '../risk/RiskManager';
import { CONFIG } from '../config';

interface BacktestResult {
    trades: Order[];
    performance: {
        totalTrades: number;
        winRate: number;
        profitLoss: number;
        maxDrawdown: number;
        sharpeRatio: number;
        roi: number;
    };
    equity: number[];
    drawdown: number[];
    timestamps: number[];
}

interface BacktestOptions {
    initialCapital: number;
    fees: number;
    slippage: number;
    useStopLoss: boolean;
    useTakeProfit: boolean;
}

export class Backtester {
    private strategy: TradingStrategy;
    private performanceMonitor: PerformanceMonitor;
    private riskManager: RiskManager;
    private options: BacktestOptions;
    private capital: number;
    private positions: Map<string, Order> = new Map();
    private trades: Order[] = [];
    private equity: number[] = [];
    private drawdown: number[] = [];

    constructor(
        strategy: TradingStrategy,
        options: BacktestOptions = {
            initialCapital: 10000,
            fees: 0.0025, // 0.25%
            slippage: 0.001, // 0.1%
            useStopLoss: true,
            useTakeProfit: true
        }
    ) {
        this.strategy = strategy;
        this.options = options;
        this.capital = options.initialCapital;
        this.performanceMonitor = new PerformanceMonitor();
        this.riskManager = new RiskManager(this.performanceMonitor);
    }

    async runBacktest(candles: Candle[]): Promise<BacktestResult> {
        this.reset();
        
        const timestamps: number[] = [];
        let highWaterMark = this.capital;

        for (let i = CONFIG.TRADING_STRATEGIES.rsi.parameters.period; i < candles.length; i++) {
            const currentCandles = candles.slice(0, i + 1);
            const currentPrice = parseFloat(currentCandles[i].close);
            timestamps.push(currentCandles[i].timestamp);

            // Update open positions
            await this.updatePositions(currentPrice, currentCandles[i].timestamp);

            // Get trading signal
            const signal = this.strategy.analyze(currentCandles);
            
            // Process signal
            if (signal.action !== 'hold') {
                await this.processSignal(signal, currentPrice, currentCandles[i].timestamp);
            }

            // Update equity curve
            const currentEquity = this.calculateCurrentEquity(currentPrice);
            this.equity.push(currentEquity);

            // Update drawdown
            highWaterMark = Math.max(highWaterMark, currentEquity);
            const currentDrawdown = ((highWaterMark - currentEquity) / highWaterMark) * 100;
            this.drawdown.push(currentDrawdown);
        }

        return this.generateResults(timestamps);
    }

    private async processSignal(signal: TradeSignal, currentPrice: number, timestamp: number): Promise<void> {
        const orderSize = this.calculateOrderSize(currentPrice);
        
        if (orderSize <= 0) return;

        const order: Order = {
            market: 'BTC-EUR', // Example market
            side: signal.action,
            orderType: 'market',
            amount: orderSize.toString(),
            price: currentPrice.toString(),
            status: 'filled',
            filledAmount: orderSize.toString(),
            created: timestamp,
            updated: timestamp
        };

        // Validate trade with risk manager
        if (await this.riskManager.validateTrade(order)) {
            // Apply fees and slippage
            const actualPrice = this.applySlippage(currentPrice, signal.action);
            const fees = orderSize * actualPrice * this.options.fees;
            
            // Update capital
            this.capital -= fees;
            if (signal.action === 'buy') {
                this.capital -= orderSize * actualPrice;
                this.positions.set('BTC-EUR', order);
            } else {
                this.capital += orderSize * actualPrice;
                this.positions.delete('BTC-EUR');
            }

            this.trades.push(order);
            await this.riskManager.updateRiskMetrics(order);
        }
    }

    private async updatePositions(currentPrice: number, timestamp: number): Promise<void> {
        for (const [market, position] of this.positions) {
            if (!position.price) continue;

            const entryPrice = parseFloat(position.price);
            const priceDiff = (currentPrice - entryPrice) / entryPrice;

            // Check stop loss
            if (this.options.useStopLoss && 
                ((position.side === 'buy' && priceDiff <= -CONFIG.SAFETY.stopLossPercentage) ||
                 (position.side === 'sell' && priceDiff >= CONFIG.SAFETY.stopLossPercentage))) {
                await this.closePosition(market, currentPrice, timestamp, 'Stop Loss');
            }
            
            // Check take profit
            else if (this.options.useTakeProfit && 
                     ((position.side === 'buy' && priceDiff >= CONFIG.SAFETY.takeProfitPercentage) ||
                      (position.side === 'sell' && priceDiff <= -CONFIG.SAFETY.takeProfitPercentage))) {
                await this.closePosition(market, currentPrice, timestamp, 'Take Profit');
            }
        }
    }

    private async closePosition(market: string, price: number, timestamp: number, reason: string): Promise<void> {
        const position = this.positions.get(market);
        if (!position || !position.amount) return;

        const closeOrder: Order = {
            market,
            side: position.side === 'buy' ? 'sell' : 'buy',
            orderType: 'market',
            amount: position.amount,
            price: price.toString(),
            status: 'filled',
            filledAmount: position.amount,
            created: timestamp,
            updated: timestamp
        };

        // Apply fees
        const orderSize = parseFloat(position.amount);
        const fees = orderSize * price * this.options.fees;
        this.capital -= fees;

        if (position.side === 'buy') {
            this.capital += orderSize * price;
        } else {
            this.capital -= orderSize * price;
        }

        this.trades.push(closeOrder);
        this.positions.delete(market);
        await this.riskManager.updateRiskMetrics(closeOrder);
    }

    private calculateOrderSize(currentPrice: number): number {
        const maxPositionSize = this.riskManager.getMaxPositionSize();
        const affordableSize = this.capital / currentPrice;
        return Math.min(maxPositionSize, affordableSize);
    }

    private applySlippage(price: number, action: 'buy' | 'sell'): number {
        const slippageMultiplier = 1 + (action === 'buy' ? this.options.slippage : -this.options.slippage);
        return price * slippageMultiplier;
    }

    private calculateCurrentEquity(currentPrice: number): number {
        let equity = this.capital;
        
        for (const [_, position] of this.positions) {
            if (!position.amount) continue;
            const positionSize = parseFloat(position.amount);
            equity += positionSize * currentPrice;
        }

        return equity;
    }

    private generateResults(timestamps: number[]): BacktestResult {
        const finalEquity = this.equity[this.equity.length - 1];
        const totalReturn = ((finalEquity - this.options.initialCapital) / this.options.initialCapital) * 100;
        const maxDrawdown = Math.max(...this.drawdown);

        // Calculate Sharpe Ratio
        const returns = this.equity.map((eq, i) => 
            i === 0 ? 0 : (eq - this.equity[i-1]) / this.equity[i-1]
        );
        const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const stdDev = Math.sqrt(
            returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length
        );
        const sharpeRatio = stdDev === 0 ? 0 : (avgReturn - 0.02) / stdDev; // 0.02 is risk-free rate

        // Calculate win rate
        const winningTrades = this.trades.filter(t => {
            if (!t.price || !t.filledAmount) return false;
            const value = parseFloat(t.price) * parseFloat(t.filledAmount);
            return t.side === 'sell' ? value > 0 : value < 0;
        });

        return {
            trades: this.trades,
            performance: {
                totalTrades: this.trades.length,
                winRate: (winningTrades.length / this.trades.length) * 100,
                profitLoss: finalEquity - this.options.initialCapital,
                maxDrawdown,
                sharpeRatio,
                roi: totalReturn
            },
            equity: this.equity,
            drawdown: this.drawdown,
            timestamps
        };
    }

    private reset(): void {
        this.capital = this.options.initialCapital;
        this.positions.clear();
        this.trades = [];
        this.equity = [this.capital];
        this.drawdown = [0];
    }

    getStrategy(): TradingStrategy {
        return this.strategy;
    }

    setStrategy(strategy: TradingStrategy): void {
        this.strategy = strategy;
    }
}
