import { Order, Balance } from '../types';
import { bitvavo } from '../api';

interface PerformanceMetrics {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    totalProfit: number;
    totalLoss: number;
    largestWin: number;
    largestLoss: number;
    averageWin: number;
    averageLoss: number;
    winRate: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
    currentDrawdown: number;
    roi: number;
}

export class PerformanceMonitor {
    private trades: Order[] = [];
    private metrics: PerformanceMetrics = this.initializeMetrics();
    private initialBalance: number = 0;
    private highWaterMark: number = 0;
    private riskFreeRate: number = 0.02; // 2% annual risk-free rate
    private readonly updateInterval: number = 60000; // 1 minuut

    constructor() {
        this.startPeriodicUpdate();
    }

    private initializeMetrics(): PerformanceMetrics {
        return {
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            totalProfit: 0,
            totalLoss: 0,
            largestWin: 0,
            largestLoss: 0,
            averageWin: 0,
            averageLoss: 0,
            winRate: 0,
            profitFactor: 0,
            sharpeRatio: 0,
            maxDrawdown: 0,
            currentDrawdown: 0,
            roi: 0
        };
    }

    private startPeriodicUpdate(): void {
        setInterval(async () => {
            await this.updateMetrics();
        }, this.updateInterval);
    }

    async initialize(): Promise<void> {
        try {
            const balances = await bitvavo.getBalance();
            this.initialBalance = this.calculateTotalBalance(balances);
            this.highWaterMark = this.initialBalance;
            
            // Laad historische trades
            const trades = await bitvavo.getOrderHistory();
            this.trades = trades;
            
            await this.updateMetrics();
        } catch (error) {
            console.error('Error initializing performance monitor:', error);
        }
    }

    private calculateTotalBalance(balances: Balance[]): number {
        return balances.reduce((total, balance) => {
            return total + (parseFloat(balance.available) + parseFloat(balance.inOrder));
        }, 0);
    }

    async updateMetrics(): Promise<void> {
        try {
            const balances = await bitvavo.getBalance();
            const currentBalance = this.calculateTotalBalance(balances);
            
            // Update high water mark
            this.highWaterMark = Math.max(this.highWaterMark, currentBalance);
            
            // Calculate metrics
            let winningTrades = 0;
            let losingTrades = 0;
            let totalProfit = 0;
            let totalLoss = 0;
            let largestWin = 0;
            let largestLoss = 0;
            
            this.trades.forEach(trade => {
                if (!trade.filledAmount || !trade.price) return;
                
                const profit = parseFloat(trade.filledAmount) * parseFloat(trade.price);
                if (profit > 0) {
                    winningTrades++;
                    totalProfit += profit;
                    largestWin = Math.max(largestWin, profit);
                } else {
                    losingTrades++;
                    totalLoss += Math.abs(profit);
                    largestLoss = Math.max(largestLoss, Math.abs(profit));
                }
            });

            const totalTrades = winningTrades + losingTrades;
            
            this.metrics = {
                totalTrades,
                winningTrades,
                losingTrades,
                totalProfit,
                totalLoss,
                largestWin,
                largestLoss,
                averageWin: winningTrades > 0 ? totalProfit / winningTrades : 0,
                averageLoss: losingTrades > 0 ? totalLoss / losingTrades : 0,
                winRate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0,
                profitFactor: totalLoss > 0 ? totalProfit / totalLoss : 0,
                sharpeRatio: this.calculateSharpeRatio(currentBalance),
                maxDrawdown: ((this.highWaterMark - currentBalance) / this.highWaterMark) * 100,
                currentDrawdown: ((this.highWaterMark - currentBalance) / this.highWaterMark) * 100,
                roi: ((currentBalance - this.initialBalance) / this.initialBalance) * 100
            };
        } catch (error) {
            console.error('Error updating performance metrics:', error);
        }
    }

    private calculateSharpeRatio(currentBalance: number): number {
        const returns = this.trades.map(trade => {
            if (!trade.filledAmount || !trade.price) return 0;
            return (parseFloat(trade.filledAmount) * parseFloat(trade.price)) / this.initialBalance;
        });

        if (returns.length === 0) return 0;

        const averageReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const stdDev = Math.sqrt(
            returns.reduce((sum, ret) => sum + Math.pow(ret - averageReturn, 2), 0) / returns.length
        );

        return stdDev === 0 ? 0 : (averageReturn - this.riskFreeRate) / stdDev;
    }

    getMetrics(): PerformanceMetrics {
        return { ...this.metrics };
    }

    addTrade(trade: Order): void {
        this.trades.push(trade);
        this.updateMetrics();
    }

    reset(): void {
        this.trades = [];
        this.metrics = this.initializeMetrics();
        this.initialize();
    }

    exportPerformanceReport(): string {
        const m = this.metrics;
        return `
Performance Rapport

Handelsstatistieken:
-------------------
Totaal aantal trades: ${m.totalTrades}
Winstgevende trades: ${m.winningTrades}
Verliesgevende trades: ${m.losingTrades}
Win rate: ${m.winRate.toFixed(2)}%

Winstgevendheid:
---------------
Totale winst: €${m.totalProfit.toFixed(2)}
Totaal verlies: €${m.totalLoss.toFixed(2)}
Grootste winst: €${m.largestWin.toFixed(2)}
Grootste verlies: €${m.largestLoss.toFixed(2)}
Gemiddelde winst: €${m.averageWin.toFixed(2)}
Gemiddeld verlies: €${m.averageLoss.toFixed(2)}

Risico Metrics:
-------------
Profit Factor: ${m.profitFactor.toFixed(2)}
Sharpe Ratio: ${m.sharpeRatio.toFixed(2)}
Maximum Drawdown: ${m.maxDrawdown.toFixed(2)}%
Huidige Drawdown: ${m.currentDrawdown.toFixed(2)}%
ROI: ${m.roi.toFixed(2)}%
        `.trim();
    }
}
