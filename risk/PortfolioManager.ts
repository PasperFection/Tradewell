import { Balance, Trade, PortfolioMetrics } from '../types';
import { CONFIG } from '../config';

export class PortfolioManager {
    private correlationMatrix: Map<string, Map<string, number>> = new Map();
    private volatilityCache: Map<string, number> = new Map();
    private readonly MAX_CORRELATION = 0.7;
    private readonly VOLATILITY_WINDOW = 20;
    private readonly MAX_POSITION_SIZE = 0.2; // 20% of portfolio

    constructor(private balances: Balance[]) {}

    public async updateMetrics(market: string, trades: Trade[]): Promise<void> {
        await this.updateVolatility(market, trades);
        await this.updateCorrelations(market);
    }

    public calculateOptimalPosition(
        market: string,
        price: number,
        signal: { confidence: number }
    ): number {
        const volatility = this.volatilityCache.get(market) || 0;
        const totalEquity = this.calculateTotalEquity();
        
        // Base position size on volatility and signal confidence
        let positionSize = totalEquity * this.MAX_POSITION_SIZE;
        positionSize *= (1 - volatility); // Reduce size for high volatility
        positionSize *= signal.confidence;

        // Check correlation with existing positions
        const correlationPenalty = this.calculateCorrelationPenalty(market);
        positionSize *= (1 - correlationPenalty);

        // Ensure position size doesn't exceed limits
        const maxPosition = totalEquity * this.MAX_POSITION_SIZE;
        return Math.min(positionSize, maxPosition);
    }

    private async updateVolatility(market: string, trades: Trade[]): Promise<void> {
        if (trades.length < this.VOLATILITY_WINDOW) {
            return;
        }

        const returns = [];
        for (let i = 1; i < trades.length; i++) {
            const return_ = (trades[i].price - trades[i-1].price) / trades[i-1].price;
            returns.push(return_);
        }

        const volatility = this.calculateStandardDeviation(returns);
        this.volatilityCache.set(market, volatility);
    }

    private async updateCorrelations(market: string): Promise<void> {
        // Implement correlation calculation between assets
        // This would typically use price data from multiple markets
        // For now, we'll use a simplified version
        if (!this.correlationMatrix.has(market)) {
            this.correlationMatrix.set(market, new Map());
        }
    }

    private calculateCorrelationPenalty(market: string): number {
        const correlations = this.correlationMatrix.get(market);
        if (!correlations) return 0;

        let maxCorrelation = 0;
        correlations.forEach((correlation) => {
            maxCorrelation = Math.max(maxCorrelation, Math.abs(correlation));
        });

        return maxCorrelation > this.MAX_CORRELATION ? 
            (maxCorrelation - this.MAX_CORRELATION) : 0;
    }

    private calculateStandardDeviation(values: number[]): number {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
        return Math.sqrt(variance);
    }

    private calculateTotalEquity(): number {
        return this.balances.reduce((total, balance) => {
            return total + parseFloat(balance.available) + parseFloat(balance.inOrder);
        }, 0);
    }

    public getPortfolioMetrics(): PortfolioMetrics {
        const totalEquity = this.calculateTotalEquity();
        const positions = this.balances.map(balance => ({
            symbol: balance.symbol,
            percentage: (parseFloat(balance.available) + parseFloat(balance.inOrder)) / totalEquity,
            volatility: this.volatilityCache.get(balance.symbol) || 0
        }));

        return {
            totalEquity,
            positions,
            diversificationScore: this.calculateDiversificationScore(),
            riskScore: this.calculatePortfolioRiskScore()
        };
    }

    private calculateDiversificationScore(): number {
        const positions = this.balances.length;
        const maxPositions = 10; // Ideal number of positions
        return Math.min(positions / maxPositions, 1);
    }

    private calculatePortfolioRiskScore(): number {
        let weightedVolatility = 0;
        const totalEquity = this.calculateTotalEquity();

        this.balances.forEach(balance => {
            const weight = (parseFloat(balance.available) + parseFloat(balance.inOrder)) / totalEquity;
            const volatility = this.volatilityCache.get(balance.symbol) || 0;
            weightedVolatility += weight * volatility;
        });

        return weightedVolatility;
    }
}
