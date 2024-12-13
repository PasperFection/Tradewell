import { TradeSignal, StatusMessage, Balance } from './types';
import { CONFIG } from './config';
import { bitvavo } from './api';
import { StrategyFactory } from './strategies';

declare global {
    interface Window {
        tradingBot: TradingBot;
    }
}

class TradingBot {
    private running: boolean = false;
    private strategy: any = null;
    private currentMarket: string = CONFIG.DEFAULT_PAIR;

    constructor() {
        this.initializeEventListeners();
    }

    private initializeEventListeners(): void {
        const startButton = document.getElementById('startBot');
        const stopButton = document.getElementById('stopBot');
        const settingsButton = document.getElementById('settings');
        const strategySelect = document.getElementById('strategySelect') as HTMLSelectElement;

        if (startButton) startButton.addEventListener('click', () => this.toggleBot());
        if (stopButton) stopButton.addEventListener('click', () => this.toggleBot());
        if (settingsButton) settingsButton.addEventListener('click', () => this.openSettings());
        
        if (strategySelect) {
            strategySelect.addEventListener('change', (e) => {
                const target = e.target as HTMLSelectElement;
                this.changeStrategy(target.value);
            });
            // Initialiseer de eerste strategie
            this.changeStrategy(strategySelect.value);
        }
    }

    private async initialize(): Promise<boolean> {
        try {
            const credentials = await this.getStoredCredentials();
            if (!credentials) {
                this.updateStatus('API credentials niet gevonden', 'error');
                return false;
            }

            await bitvavo.initialize(credentials.apiKey, credentials.apiSecret);
            this.updateApiStatus(true);
            await this.updateBalance();
            return true;
        } catch (error) {
            console.error('Initialisatie error:', error);
            this.updateStatus(`Initialisatie mislukt: ${error instanceof Error ? error.message : 'Onbekende fout'}`, 'error');
            return false;
        }
    }

    private async getStoredCredentials(): Promise<{ apiKey: string; apiSecret: string } | null> {
        return new Promise((resolve) => {
            chrome.storage.local.get(['apiKey', 'apiSecret'], (result) => {
                if (result.apiKey && result.apiSecret) {
                    resolve({
                        apiKey: result.apiKey,
                        apiSecret: result.apiSecret
                    });
                } else {
                    resolve(null);
                }
            });
        });
    }

    private updateApiStatus(connected: boolean): void {
        const statusElement = document.getElementById('apiStatus');
        if (statusElement) {
            statusElement.textContent = connected ? 'Verbonden' : 'Niet verbonden';
            statusElement.className = `api-status ${connected ? 'connected' : ''}`;
        }
    }

    private async updateBalance(): Promise<void> {
        try {
            const balances = await bitvavo.getBalance();
            const eurBalance = balances.find(b => b.symbol === 'EUR')?.available || '0';
            const btcBalance = balances.find(b => b.symbol === 'BTC')?.available || '0';
            
            const balanceElement = document.getElementById('balance');
            if (balanceElement) {
                balanceElement.textContent = 
                    `€${parseFloat(eurBalance).toFixed(2)} | ₿${parseFloat(btcBalance).toFixed(8)}`;
            }
        } catch (error) {
            console.error('Balance update error:', error);
            this.updateStatus('Kon saldo niet updaten', 'error');
        }
    }

    private updateStatus(message: string, type: StatusMessage['type'] = 'info'): void {
        const statusContainer = document.getElementById('statusMessages');
        if (!statusContainer) return;

        const messageElement = document.createElement('div');
        messageElement.className = `status-message ${type}`;
        messageElement.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
        
        statusContainer.insertBefore(messageElement, statusContainer.firstChild);
        
        // Verwijder het laatste bericht als er meer dan 5 zijn
        const messages = statusContainer.getElementsByClassName('status-message');
        if (messages.length > 5 && messages[messages.length - 1]) {
            messages[messages.length - 1].remove();
        }
    }

    private changeStrategy(strategyType: string): void {
        try {
            this.strategy = StrategyFactory.create(strategyType);
            this.updateStatus(`Strategie gewijzigd naar: ${CONFIG.TRADING_STRATEGIES[strategyType].name}`);
        } catch (error) {
            console.error('Strategy change error:', error);
            this.updateStatus(`Kon strategie niet wijzigen: ${error instanceof Error ? error.message : 'Onbekende fout'}`, 'error');
        }
    }

    private async toggleBot(): Promise<void> {
        if (!this.running) {
            if (await this.initialize()) {
                this.running = true;
                const startButton = document.getElementById('startBot') as HTMLButtonElement;
                const stopButton = document.getElementById('stopBot') as HTMLButtonElement;
                if (startButton) startButton.disabled = true;
                if (stopButton) stopButton.disabled = false;
                this.updateStatus('Bot gestart');
                this.startTrading();
            }
        } else {
            this.running = false;
            const startButton = document.getElementById('startBot') as HTMLButtonElement;
            const stopButton = document.getElementById('stopBot') as HTMLButtonElement;
            if (startButton) startButton.disabled = false;
            if (stopButton) stopButton.disabled = true;
            this.updateStatus('Bot gestopt');
        }
    }

    private async startTrading(): Promise<void> {
        while (this.running) {
            try {
                const candles = await bitvavo.getCandles(this.currentMarket, '1h', 24);
                const analysis = await this.strategy.analyze(this.currentMarket, candles);
                
                this.updateStatus(`Analyse: ${analysis.action} (${analysis.reason})`);
                
                if (analysis.confidence > 0.7) {
                    await this.executeTradeSignal(analysis);
                }
                
                await this.updateBalance();
                await new Promise(resolve => setTimeout(resolve, 60000)); // Wacht 1 minuut
            } catch (error) {
                console.error('Trading error:', error);
                this.updateStatus(`Handelsfout: ${error instanceof Error ? error.message : 'Onbekende fout'}`, 'error');
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }

    private async executeTradeSignal(signal: TradeSignal): Promise<void> {
        try {
            const ticker = await bitvavo.getTicker(this.currentMarket);
            const currentPrice = parseFloat(ticker.last);
            
            // Implementeer hier je handelslogica met veiligheidscontroles
            this.updateStatus(`Handelssignaal ontvangen: ${signal.action} @ €${currentPrice}`);
            
            // Hier zou je de daadwerkelijke order plaatsen
            // await bitvavo.createOrder(...);
            
        } catch (error) {
            console.error('Trade execution error:', error);
            this.updateStatus(`Order uitvoering mislukt: ${error instanceof Error ? error.message : 'Onbekende fout'}`, 'error');
        }
    }

    private openSettings(): void {
        // Implementeer settings popup
        this.updateStatus('Settings functionaliteit komt binnenkort');
    }
}

// Start de applicatie
document.addEventListener('DOMContentLoaded', () => {
    window.tradingBot = new TradingBot();
});
