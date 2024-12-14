import { Candle, TradeSignal, BacktestResult, TradingStrategy } from '../types';
import { calculatePositionSize, calculateRiskRewardRatio } from '../risk/RiskCalculator';

export class BacktestEngine {
    constructor(
        private strategy: TradingStrategy,
        private initialBalance: number,
        private riskPerTrade: number,
        private commission: number = 0.0025
    ) {}

    async runBacktest(
        market: string,
        candles: Candle[],
        startDate: Date,
        endDate: Date
    ): Promise<BacktestResult> {
        let balance = this.initialBalance;
        let position = 0;
        const trades: Array<{
            type: 'buy' | 'sell';
            price: number;
            size: number;
            timestamp: number;
            balance: number;
        }> = [];

        const results = {
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            profitFactor: 0,
            sharpeRatio: 0,
            maxDrawdown: 0,
            returns: [] as number[],
            equity: [] as number[]
        };

        for (let i = 50; i < candles.length; i++) {
            const signal = await this.strategy.analyze(
                market,
                candles.slice(i - 50, i)
            );

            if (signal.action !== 'hold') {
                const price = parseFloat(candles[i].close);
                
                if (signal.action === 'buy' && position <= 0) {
                    const size = calculatePositionSize({
                        accountBalance: balance,
                        riskPercentage: this.riskPerTrade,
                        stopLoss: price * 0.98,
                        entryPrice: price
                    });

                    position = size;
                    balance -= size * price * (1 + this.commission);
                    trades.push({
                        type: 'buy',
                        price,
                        size,
                        timestamp: candles[i].timestamp,
                        balance
                    });
                } else if (signal.action === 'sell' && position >= 0) {
                    if (position > 0) {
                        balance += position * price * (1 - this.commission);
                        trades.push({
                            type: 'sell',
                            price,
                            size: position,
                            timestamp: candles[i].timestamp,
                            balance
                        });
                        position = 0;
                    }
                }
            }

            results.equity.push(balance + (position * parseFloat(candles[i].close)));
        }

        // Calculate performance metrics
        results.totalTrades = trades.length;
        let totalProfit = 0;
        let totalLoss = 0;
        let maxDrawdown = 0;
        let peak = results.equity[0];

        for (let i = 1; i < results.equity.length; i++) {
            const return_ = (results.equity[i] - results.equity[i-1]) / results.equity[i-1];
            results.returns.push(return_);

            if (results.equity[i] > peak) {
                peak = results.equity[i];
            } else {
                const drawdown = (peak - results.equity[i]) / peak;
                maxDrawdown = Math.max(maxDrawdown, drawdown);
            }
        }

        trades.forEach((trade, i) => {
            if (i % 2 === 1) {
                const profit = trade.balance - trades[i-1].balance;
                if (profit > 0) {
                    totalProfit += profit;
                    results.winningTrades++;
                } else {
                    totalLoss -= profit;
                    results.losingTrades++;
                }
            }
        });

        results.profitFactor = totalProfit / (totalLoss || 1);
        results.maxDrawdown = maxDrawdown;

        // Calculate Sharpe Ratio
        const avgReturn = results.returns.reduce((a, b) => a + b, 0) / results.returns.length;
        const stdDev = Math.sqrt(
            results.returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / results.returns.length
        );
        results.sharpeRatio = avgReturn / stdDev * Math.sqrt(252); // Annualized

        return {
            trades,
            metrics: results,
            finalBalance: balance,
            finalEquity: results.equity[results.equity.length - 1]
        };
    }
}
