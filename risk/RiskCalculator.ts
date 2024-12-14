import { Order, Trade } from '../types';

export class RiskCalculator {
  private readonly volatilityWindow: number = 20;
  private readonly riskFreeRate: number = 0.02; // 2% annual risk-free rate

  constructor(private maxRiskPerTrade: number = 0.02) {}

  calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;

    const returns = prices.slice(1).map((price, i) => 
      Math.log(price / prices[i])
    );

    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => 
      sum + Math.pow(ret - mean, 2), 0
    ) / (returns.length - 1);

    return Math.sqrt(variance * 252); // Annualized volatility
  }

  calculateSharpeRatio(returns: number[]): number {
    if (returns.length < 2) return 0;

    const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const excessReturns = meanReturn - this.riskFreeRate;
    const stdDev = Math.sqrt(
      returns.reduce((sum, ret) => 
        sum + Math.pow(ret - meanReturn, 2), 0
      ) / (returns.length - 1)
    );

    return stdDev === 0 ? 0 : excessReturns / stdDev;
  }

  calculateMaxDrawdown(equity: number[]): number {
    let maxDrawdown = 0;
    let peak = equity[0];

    for (const value of equity) {
      if (value > peak) {
        peak = value;
      }
      const drawdown = (peak - value) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown;
  }

  calculatePositionSize(
    availableBalance: number,
    price: number,
    volatility: number
  ): number {
    const riskAmount = availableBalance * this.maxRiskPerTrade;
    const positionSize = riskAmount / (price * volatility);
    return Math.min(positionSize, availableBalance / price);
  }

  validateOrder(order: Order, balance: number): boolean {
    if (!order.amount || !order.price) {
      return false;
    }
    const orderValue = order.amount * order.price;
    return orderValue <= balance * this.maxRiskPerTrade;
  }

  calculateStopLoss(
    entryPrice: number,
    side: 'buy' | 'sell',
    volatility: number
  ): number {
    const stopDistance = entryPrice * volatility * 2;
    return side === 'buy' 
      ? entryPrice - stopDistance 
      : entryPrice + stopDistance;
  }

  calculateTakeProfit(
    entryPrice: number,
    side: 'buy' | 'sell',
    volatility: number
  ): number {
    const profitDistance = entryPrice * volatility * 3;
    return side === 'buy'
      ? entryPrice + profitDistance
      : entryPrice - profitDistance;
  }
}
