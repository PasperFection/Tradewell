# Trading Documentatie

## Trading Strategieën

### 1. RSI Strategy
De RSI (Relative Strength Index) strategie is gebaseerd op overbought/oversold condities in de markt.

#### Parameters
- `rsiPeriod`: 14 (standaard)
- `overboughtLevel`: 70
- `oversoldLevel`: 30
- `confirmationPeriod`: 2

#### Logica
- KOOP signaal: RSI < oversoldLevel voor confirmationPeriod
- VERKOOP signaal: RSI > overboughtLevel voor confirmationPeriod

### 2. MACD Strategy
De MACD (Moving Average Convergence Divergence) strategie identificeert trend veranderingen.

#### Parameters
- `fastPeriod`: 12
- `slowPeriod`: 26
- `signalPeriod`: 9
- `confirmationCandles`: 3

#### Logica
- KOOP signaal: MACD lijn kruist signaal lijn naar boven
- VERKOOP signaal: MACD lijn kruist signaal lijn naar beneden

### 3. Volume Weighted Strategy
Analyseert prijsactie in relatie tot handelsvolume.

#### Parameters
- `vwapPeriod`: 20
- `volumeThreshold`: 1.5
- `priceDeviation`: 0.02

#### Logica
- KOOP signaal: Prijs onder VWAP met hoog volume
- VERKOOP signaal: Prijs boven VWAP met hoog volume

## Risk Management

### Position Sizing
```typescript
interface PositionSize {
  accountBalance: number;
  riskPercentage: number;
  stopLoss: number;
  entryPrice: number;
}

function calculatePositionSize({
  accountBalance,
  riskPercentage,
  stopLoss,
  entryPrice
}: PositionSize): number {
  const riskAmount = accountBalance * (riskPercentage / 100);
  const stopLossDistance = Math.abs(entryPrice - stopLoss);
  return riskAmount / stopLossDistance;
}
```

### Risk/Reward Ratio
```typescript
interface RiskReward {
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
}

function calculateRiskRewardRatio({
  entryPrice,
  stopLoss,
  takeProfit
}: RiskReward): number {
  const risk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(takeProfit - entryPrice);
  return reward / risk;
}
```

## Order Types

### 1. Market Order
Direct uitvoeren tegen beste beschikbare prijs.
```typescript
interface MarketOrder {
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
}
```

### 2. Limit Order
Uitvoeren tegen specifieke prijs of beter.
```typescript
interface LimitOrder extends MarketOrder {
  price: number;
  timeInForce: 'GTC' | 'IOC' | 'FOK';
}
```

### 3. Stop-Loss Order
Bescherming tegen grote verliezen.
```typescript
interface StopLossOrder extends MarketOrder {
  stopPrice: number;
  type: 'stop_loss' | 'stop_loss_limit';
}
```

## Performance Metrics

### 1. Sharpe Ratio
```typescript
function calculateSharpeRatio(
  returns: number[],
  riskFreeRate: number
): number {
  const excess = returns.map(r => r - riskFreeRate);
  const mean = average(excess);
  const std = standardDeviation(excess);
  return mean / std;
}
```

### 2. Maximum Drawdown
```typescript
function calculateMaxDrawdown(equity: number[]): number {
  let peak = equity[0];
  let maxDrawdown = 0;

  for (const value of equity) {
    if (value > peak) peak = value;
    const drawdown = (peak - value) / peak;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  return maxDrawdown;
}
```

### 3. Win Rate
```typescript
function calculateWinRate(trades: Trade[]): number {
  const winningTrades = trades.filter(t => t.profit > 0);
  return winningTrades.length / trades.length;
}
```

## Backtesting

### Configuration
```typescript
interface BacktestConfig {
  strategy: TradingStrategy;
  symbol: string;
  timeframe: string;
  startDate: Date;
  endDate: Date;
  initialBalance: number;
  fees: {
    maker: number;
    taker: number;
  };
}
```

### Results Analysis
```typescript
interface BacktestResults {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  returns: {
    absolute: number;
    percentage: number;
  };
  equity: number[];
}
```

## Best Practices

### 1. Entry Rules
- Wacht op bevestiging van meerdere indicatoren
- Check markt context en trend
- Evalueer risk/reward ratio

### 2. Position Management
- Gebruik altijd stop-loss orders
- Pas position sizing toe
- Verdeel grote orders in kleinere delen

### 3. Risk Management
- Maximaal 1-2% risico per trade
- Maximaal 5% account risico tegelijk
- Gebruik trailing stops voor winst bescherming

### 4. Performance Monitoring
- Houd een trading journal bij
- Evalueer strategieën regelmatig
- Monitor drawdown en herstelperiode
