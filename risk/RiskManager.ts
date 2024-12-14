import { Order, Balance, Config } from '../types';
import { bitvavo } from '../api';
import { CONFIG } from '../config';
import { PerformanceMonitor } from '../performance/PerformanceMonitor';

interface RiskMetrics {
    currentRisk: number;
    availableRisk: number;
    positionSize: number;
    leverageUsed: number;
    exposureRatio: number;
    marginUsage: number;
}

export class RiskManager {
    private performanceMonitor: PerformanceMonitor;
    private config: Config;
    private maxRiskPerTrade: number;
    private maxDailyRisk: number;
    private dailyLoss: number = 0;
    private lastResetDate: Date;
    private emergencyShutdownTriggered: boolean = false;

    constructor(
        performanceMonitor: PerformanceMonitor,
        config: Config = CONFIG,
        maxRiskPerTrade: number = 0.02, // 2% per trade
        maxDailyRisk: number = 0.05 // 5% per dag
    ) {
        this.performanceMonitor = performanceMonitor;
        this.config = config;
        this.maxRiskPerTrade = maxRiskPerTrade;
        this.maxDailyRisk = maxDailyRisk;
        this.lastResetDate = new Date();
    }

    private resetDailyMetrics(): void {
        const now = new Date();
        if (now.getUTCDate() !== this.lastResetDate.getUTCDate()) {
            this.dailyLoss = 0;
            this.lastResetDate = now;
        }
    }

    async validateTrade(order: Order): Promise<boolean> {
        this.resetDailyMetrics();

        if (this.emergencyShutdownTriggered) {
            console.error('Emergency shutdown is active - trading is disabled');
            return false;
        }

        try {
            const riskMetrics = await this.calculateRiskMetrics();
            
            // Check position size
            if (order.amount && parseFloat(order.amount) > riskMetrics.positionSize) {
                console.warn('Order size exceeds maximum position size');
                return false;
            }

            // Check leverage
            if (riskMetrics.leverageUsed > this.config.SAFETY.maxLeverage) {
                console.warn('Leverage limit exceeded');
                return false;
            }

            // Check daily risk
            if (this.dailyLoss >= this.maxDailyRisk) {
                console.warn('Daily risk limit reached');
                return false;
            }

            // Check drawdown
            const metrics = this.performanceMonitor.getMetrics();
            if (metrics.currentDrawdown >= this.config.SAFETY.maxDrawdown) {
                console.warn('Maximum drawdown reached');
                return false;
            }

            // Emergency stop loss check
            if (metrics.currentDrawdown >= this.config.SAFETY.emergencyStopLoss) {
                this.triggerEmergencyShutdown();
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error validating trade:', error);
            return false;
        }
    }

    private async calculateRiskMetrics(): Promise<RiskMetrics> {
        const balances = await bitvavo.getBalance();
        const totalBalance = this.calculateTotalBalance(balances);
        const openOrders = await bitvavo.getOrderHistory();
        
        const exposureValue = this.calculateTotalExposure(openOrders);
        const marginUsed = this.calculateMarginUsage(openOrders);

        return {
            currentRisk: exposureValue / totalBalance,
            availableRisk: this.maxRiskPerTrade - (exposureValue / totalBalance),
            positionSize: totalBalance * this.maxRiskPerTrade,
            leverageUsed: marginUsed / totalBalance,
            exposureRatio: exposureValue / totalBalance,
            marginUsage: marginUsed
        };
    }

    private calculateTotalBalance(balances: Balance[]): number {
        return balances.reduce((total, balance) => {
            return total + (parseFloat(balance.available) + parseFloat(balance.inOrder));
        }, 0);
    }

    private calculateTotalExposure(orders: Order[]): number {
        return orders.reduce((total, order) => {
            if (order.status !== 'filled' || !order.filledAmount || !order.price) return total;
            return total + (parseFloat(order.filledAmount) * parseFloat(order.price));
        }, 0);
    }

    private calculateMarginUsage(orders: Order[]): number {
        return orders.reduce((total, order) => {
            if (order.status !== 'filled' || !order.filledAmount || !order.price) return total;
            const orderValue = parseFloat(order.filledAmount) * parseFloat(order.price);
            return total + (orderValue / this.config.SAFETY.maxLeverage);
        }, 0);
    }

    async updateRiskMetrics(trade: Order): Promise<void> {
        if (!trade.filledAmount || !trade.price) return;

        const tradeValue = parseFloat(trade.filledAmount) * parseFloat(trade.price);
        if (tradeValue < 0) {
            this.dailyLoss += Math.abs(tradeValue);
        }

        // Update performance metrics
        this.performanceMonitor.addTrade(trade);

        // Check for emergency shutdown conditions
        const metrics = this.performanceMonitor.getMetrics();
        if (metrics.currentDrawdown >= this.config.SAFETY.emergencyStopLoss) {
            this.triggerEmergencyShutdown();
        }
    }

    private triggerEmergencyShutdown(): void {
        this.emergencyShutdownTriggered = true;
        console.error('EMERGENCY SHUTDOWN TRIGGERED - All trading stopped');
        
        // Implementeer hier extra shutdown logica
        // Bijvoorbeeld: sluit alle open posities, cancel alle orders, etc.
    }

    isEmergencyShutdownActive(): boolean {
        return this.emergencyShutdownTriggered;
    }

    resetEmergencyShutdown(): void {
        this.emergencyShutdownTriggered = false;
        console.log('Emergency shutdown reset - Trading re-enabled');
    }

    getMaxPositionSize(): number {
        return this.config.SAFETY.maxOrderSize;
    }

    getRiskMetrics(): Promise<RiskMetrics> {
        return this.calculateRiskMetrics();
    }
}
