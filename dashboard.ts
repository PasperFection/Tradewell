import { bitvavo } from './api';
import { CONFIG } from './config';
import { RSIStrategy, MACDStrategy, VolumeWeightedStrategy } from './strategies/advanced';
import { Balance, Candle, TradeSignal, Order, Trade } from './types';

class DashboardManager {
    private charts: {
        portfolio: Chart;
        allocation: Chart;
        tradingview: any;
    };
    private strategies: {
        rsi: RSIStrategy;
        macd: MACDStrategy;
        volume: VolumeWeightedStrategy;
    };
    private selectedPair: string = 'BTC-EUR';
    private updateInterval: number = 5000; // 5 seconds
    private socket: WebSocket;

    constructor() {
        this.initializeWebSocket();
        this.initializeCharts();
        this.initializeStrategies();
        this.setupEventListeners();
        this.startDataUpdates();
    }

    private initializeWebSocket(): void {
        this.socket = new WebSocket('wss://ws.bitvavo.com/v2/');
        
        this.socket.onopen = () => {
            const subscribeMsg = {
                action: 'subscribe',
                channels: ['ticker', 'trades', 'book'],
                markets: [this.selectedPair]
            };
            this.socket.send(JSON.stringify(subscribeMsg));
        };

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.showNotification('WebSocket connectie fout', 'error');
        };

        this.socket.onclose = () => {
            console.log('WebSocket closed, attempting to reconnect...');
            setTimeout(() => this.initializeWebSocket(), 5000);
        };
    }

    private handleWebSocketMessage(data: any): void {
        switch (data.event) {
            case 'ticker':
                this.updateMarketPrice(data);
                break;
            case 'trade':
                this.updateTradeHistory(data);
                break;
            case 'book':
                this.updateOrderBook(data);
                break;
        }
    }

    private initializeCharts(): void {
        // Portfolio Value Chart
        const portfolioCtx = document.getElementById('portfolioChart') as HTMLCanvasElement;
        this.charts.portfolio = new Chart(portfolioCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Portfolio Waarde',
                    data: [],
                    borderColor: CONFIG.CHART_COLORS.primary,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });

        // Asset Allocation Chart
        const allocationCtx = document.getElementById('allocationChart') as HTMLCanvasElement;
        this.charts.allocation = new Chart(allocationCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: Object.values(CONFIG.CHART_COLORS)
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });

        // TradingView Chart
        this.charts.tradingview = new TradingView.widget({
            container_id: 'tradingview_chart',
            symbol: `BITVAVO:${this.selectedPair.replace('-', '')}`,
            interval: 'D',
            theme: 'Light',
            style: '1',
            locale: 'nl_NL',
            toolbar_bg: '#f1f3f6',
            enable_publishing: false,
            hide_side_toolbar: false,
            allow_symbol_change: true,
            studies: [
                'RSI@tv-basicstudies',
                'MACD@tv-basicstudies',
                'Volume@tv-basicstudies'
            ]
        });
    }

    private initializeStrategies(): void {
        this.strategies = {
            rsi: new RSIStrategy(),
            macd: new MACDStrategy(),
            volume: new VolumeWeightedStrategy()
        };
    }

    private setupEventListeners(): void {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleNavigation(item as HTMLElement);
            });
        });

        // Trading Form
        const orderForm = document.getElementById('orderForm');
        if (orderForm) {
            orderForm.addEventListener('submit', this.handleOrderSubmit.bind(this));
        }

        // Market Pair Selection
        const pairSelect = document.querySelector('.mui-select');
        if (pairSelect) {
            pairSelect.addEventListener('change', (e) => {
                this.selectedPair = (e.target as HTMLSelectElement).value;
                this.updateTradingView();
            });
        }

        // Order Type Toggle
        document.querySelectorAll('.order-type-selector button').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleOrderType(button as HTMLElement);
            });
        });
    }

    private handleNavigation(item: HTMLElement): void {
        // Remove active class from all items
        document.querySelectorAll('.nav-item').forEach(navItem => {
            navItem.classList.remove('active');
        });

        // Add active class to clicked item
        item.classList.add('active');

        // Hide all sections
        document.querySelectorAll('.dashboard-section').forEach(section => {
            section.classList.add('hidden');
        });

        // Show selected section
        const targetId = item.getAttribute('href')?.substring(1);
        if (targetId) {
            document.getElementById(targetId)?.classList.remove('hidden');
        }
    }

    private async handleOrderSubmit(event: Event): Promise<void> {
        event.preventDefault();
        
        const formData = new FormData(event.target as HTMLFormElement);
        const orderType = document.querySelector('.order-type-selector .active')?.textContent?.toLowerCase();
        
        const order: Order = {
            market: formData.get('pair') as string,
            side: formData.get('side') as 'buy' | 'sell',
            amount: parseFloat(formData.get('amount') as string),
            type: orderType as 'market' | 'limit',
            price: orderType === 'limit' ? parseFloat(formData.get('price') as string) : undefined,
            stopLoss: parseFloat(formData.get('stopLoss') as string),
            takeProfit: parseFloat(formData.get('takeProfit') as string)
        };

        try {
            await this.showOrderConfirmation(order);
            const response = await bitvavo.placeOrder(order);
            this.showNotification('Order succesvol geplaatst', 'success');
            this.updatePortfolio();
        } catch (error) {
            console.error('Order error:', error);
            this.showNotification('Fout bij het plaatsen van order', 'error');
        }
    }

    private toggleOrderType(button: HTMLElement): void {
        document.querySelectorAll('.order-type-selector button').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');

        // Show/hide price input based on order type
        const priceInput = document.querySelector('.price-input');
        if (priceInput) {
            priceInput.classList.toggle('hidden', button.textContent?.toLowerCase() === 'market');
        }
    }

    private async showOrderConfirmation(order: Order): Promise<void> {
        const modal = document.getElementById('confirmationModal');
        const details = modal?.querySelector('.order-details');
        
        if (details) {
            details.innerHTML = `
                <div class="order-detail">
                    <span>Type:</span>
                    <span>${order.type.toUpperCase()} ${order.side.toUpperCase()}</span>
                </div>
                <div class="order-detail">
                    <span>Pair:</span>
                    <span>${order.market}</span>
                </div>
                <div class="order-detail">
                    <span>Amount:</span>
                    <span>${order.amount}</span>
                </div>
                ${order.price ? `
                <div class="order-detail">
                    <span>Price:</span>
                    <span>€${order.price}</span>
                </div>
                ` : ''}
                <div class="order-detail">
                    <span>Total:</span>
                    <span>€${order.price ? order.amount * order.price : 'Market Price'}</span>
                </div>
            `;
        }

        if (modal) {
            modal.style.display = 'block';
        }

        return new Promise((resolve, reject) => {
            const confirmBtn = modal?.querySelector('.confirm');
            const cancelBtn = modal?.querySelector('.cancel');

            if (confirmBtn && cancelBtn) {
                confirmBtn.addEventListener('click', () => {
                    modal?.style.display = 'none';
                    resolve();
                });

                cancelBtn.addEventListener('click', () => {
                    modal?.style.display = 'none';
                    reject(new Error('Order cancelled'));
                });
            }
        });
    }

    private async startDataUpdates(): Promise<void> {
        await this.updateAllData();
        setInterval(() => this.updateAllData(), this.updateInterval);
    }

    private async updateAllData(): Promise<void> {
        try {
            await Promise.all([
                this.updatePortfolio(),
                this.updateMarketData(),
                this.updateStrategySignals()
            ]);
        } catch (error) {
            console.error('Error updating data:', error);
            this.showNotification('Fout bij het updaten van data', 'error');
        }
    }

    private async updatePortfolio(): Promise<void> {
        const balances = await bitvavo.getBalance();
        const assets = await Promise.all(
            balances.filter(b => parseFloat(b.available) > 0).map(async (balance) => {
                let value = 0;
                if (balance.symbol !== 'EUR') {
                    const ticker = await bitvavo.getTicker(`${balance.symbol}-EUR`);
                    value = parseFloat(balance.available) * parseFloat(ticker.last);
                } else {
                    value = parseFloat(balance.available);
                }

                return {
                    symbol: balance.symbol,
                    amount: parseFloat(balance.available),
                    value
                };
            })
        );

        // Update portfolio value
        const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);
        document.querySelector('.portfolio-value .value')!.textContent = 
            `€${totalValue.toFixed(2)}`;

        // Update allocation chart
        this.charts.allocation.data.labels = assets.map(a => a.symbol);
        this.charts.allocation.data.datasets[0].data = assets.map(a => a.value);
        this.charts.allocation.update();

        // Update metrics
        this.updatePerformanceMetrics();
    }

    private async updateMarketData(): Promise<void> {
        const candles = await bitvavo.getCandles(this.selectedPair, '1h', 24);
        const lastPrice = parseFloat(candles[candles.length - 1].close);
        const prevPrice = parseFloat(candles[0].close);
        const change = ((lastPrice - prevPrice) / prevPrice) * 100;

        // Update price display
        document.querySelector(`#${this.selectedPair.toLowerCase()} .price`)!.textContent = 
            `€${lastPrice.toFixed(2)}`;
        document.querySelector(`#${this.selectedPair.toLowerCase()} .change`)!.textContent = 
            `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
    }

    private async updateStrategySignals(): Promise<void> {
        const candles = await bitvavo.getCandles(this.selectedPair, '1h', 100);
        
        const [rsiSignal, macdSignal, volumeSignal] = await Promise.all([
            this.strategies.rsi.analyze(this.selectedPair, candles),
            this.strategies.macd.analyze(this.selectedPair, candles),
            this.strategies.volume.analyze(this.selectedPair, candles)
        ]);

        // Update strategy signals display
        const signalsContainer = document.querySelector('.strategy-signals');
        if (signalsContainer) {
            signalsContainer.innerHTML = `
                <div class="strategy-signal ${rsiSignal.action}">
                    <span class="strategy-name">RSI</span>
                    <span class="signal-action">${rsiSignal.action.toUpperCase()}</span>
                    <span class="signal-confidence">${(rsiSignal.confidence * 100).toFixed(1)}%</span>
                </div>
                <div class="strategy-signal ${macdSignal.action}">
                    <span class="strategy-name">MACD</span>
                    <span class="signal-action">${macdSignal.action.toUpperCase()}</span>
                    <span class="signal-confidence">${(macdSignal.confidence * 100).toFixed(1)}%</span>
                </div>
                <div class="strategy-signal ${volumeSignal.action}">
                    <span class="strategy-name">Volume</span>
                    <span class="signal-action">${volumeSignal.action.toUpperCase()}</span>
                    <span class="signal-confidence">${(volumeSignal.confidence * 100).toFixed(1)}%</span>
                </div>
            `;
        }
    }

    private updatePerformanceMetrics(): void {
        // Implement performance metrics calculation
        const metrics = {
            roi: 0,
            winRate: 0,
            sharpeRatio: 0,
            maxDrawdown: 0
        };

        document.querySelectorAll('.performance .metric').forEach(metric => {
            const label = metric.querySelector('label')?.textContent?.toLowerCase();
            const value = metric.querySelector('span');
            
            if (value) {
                switch (label) {
                    case 'roi (30d)':
                        value.textContent = `${metrics.roi.toFixed(2)}%`;
                        break;
                    case 'win rate':
                        value.textContent = `${metrics.winRate.toFixed(2)}%`;
                        break;
                    case 'sharpe ratio':
                        value.textContent = metrics.sharpeRatio.toFixed(2);
                        break;
                    case 'drawdown':
                        value.textContent = `${metrics.maxDrawdown.toFixed(2)}%`;
                        break;
                }
            }
        });
    }

    private updateMarketPrice(data: any): void {
        const priceElement = document.querySelector(`#${data.market.toLowerCase()} .price`);
        const changeElement = document.querySelector(`#${data.market.toLowerCase()} .change`);
        
        if (priceElement && changeElement) {
            priceElement.textContent = `€${parseFloat(data.last).toFixed(2)}`;
            changeElement.textContent = `${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)}%`;
            changeElement.className = `change ${data.change >= 0 ? 'positive' : 'negative'}`;
        }
    }

    private updateTradeHistory(trade: Trade): void {
        const tradesContainer = document.querySelector('.recent-trades tbody');
        if (!tradesContainer) return;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(trade.timestamp).toLocaleTimeString()}</td>
            <td>${trade.market}</td>
            <td class="${trade.side}">${trade.side.toUpperCase()}</td>
            <td>€${parseFloat(trade.price).toFixed(2)}</td>
            <td>${parseFloat(trade.amount).toFixed(8)}</td>
            <td class="${trade.side === 'buy' ? 'negative' : 'positive'}">
                €${(parseFloat(trade.amount) * parseFloat(trade.price)).toFixed(2)}
            </td>
        `;

        tradesContainer.insertBefore(row, tradesContainer.firstChild);
        if (tradesContainer.children.length > 10) {
            tradesContainer.removeChild(tradesContainer.lastChild!);
        }
    }

    private updateOrderBook(data: any): void {
        const asksContainer = document.querySelector('.order-book .asks');
        const bidsContainer = document.querySelector('.order-book .bids');
        const spreadElement = document.querySelector('.order-book .spread span');
        
        if (!asksContainer || !bidsContainer || !spreadElement) return;

        // Update asks
        asksContainer.innerHTML = data.asks.slice(0, 10).map((ask: string[]) => `
            <div class="order-book-row">
                <span class="price">€${parseFloat(ask[0]).toFixed(2)}</span>
                <span class="amount">${parseFloat(ask[1]).toFixed(8)}</span>
                <div class="depth-visualization" style="width: ${(parseFloat(ask[1]) / data.asks[0][1] * 100)}%"></div>
            </div>
        `).join('');

        // Update bids
        bidsContainer.innerHTML = data.bids.slice(0, 10).map((bid: string[]) => `
            <div class="order-book-row">
                <span class="price">€${parseFloat(bid[0]).toFixed(2)}</span>
                <span class="amount">${parseFloat(bid[1]).toFixed(8)}</span>
                <div class="depth-visualization" style="width: ${(parseFloat(bid[1]) / data.bids[0][1] * 100)}%"></div>
            </div>
        `).join('');

        // Update spread
        const spread = parseFloat(data.asks[0][0]) - parseFloat(data.bids[0][0]);
        const spreadPercentage = (spread / parseFloat(data.asks[0][0])) * 100;
        spreadElement.textContent = `Spread: €${spread.toFixed(2)} (${spreadPercentage.toFixed(2)}%)`;
    }

    private showNotification(message: string, type: 'success' | 'error' | 'warning'): void {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span class="material-icons">${this.getNotificationIcon(type)}</span>
            <span class="message">${message}</span>
        `;

        const container = document.querySelector('.notifications');
        if (container) {
            container.appendChild(notification);
            setTimeout(() => notification.remove(), 5000);
        }
    }

    private getNotificationIcon(type: string): string {
        switch (type) {
            case 'success': return 'check_circle';
            case 'error': return 'error';
            case 'warning': return 'warning';
            default: return 'info';
        }
    }
}

// Start de dashboard applicatie
document.addEventListener('DOMContentLoaded', () => {
    new DashboardManager();
});
