import { TradingManager } from '../trading/TradingManager';
import { CONFIG } from '../config';

type Timeout = ReturnType<typeof setTimeout>;

export class WebSocketManager {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectTimeout: Timeout | null = null;
    private heartbeatInterval: Timeout | null = null;
    private tradingManager: TradingManager;

    constructor(tradingManager: TradingManager) {
        this.tradingManager = tradingManager;
    }

    connect(): void {
        if (this.ws) {
            this.ws.close();
        }

        this.ws = new WebSocket(CONFIG.WS_URL);
        this.ws.onopen = this.handleOpen.bind(this);
        this.ws.onmessage = this.handleMessage.bind(this);
        this.ws.onclose = this.handleClose.bind(this);
        this.ws.onerror = this.handleError.bind(this);

        // Start heartbeat
        this.startHeartbeat();
    }

    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }

    private handleOpen(): void {
        console.log('WebSocket connection established');
        this.reconnectAttempts = 0;
        this.subscribe();
    }

    private handleMessage(event: MessageEvent): void {
        try {
            const data = JSON.parse(event.data);
            this.processMessage(data);
        } catch (err) {
            console.error('Error processing message:', err instanceof Error ? err.message : String(err));
        }
    }

    private handleClose(): void {
        console.log('WebSocket connection closed');
        this.cleanup();
        this.scheduleReconnect();
    }

    private handleError(error: Event): void {
        console.error('WebSocket error:', error);
        this.cleanup();
        this.scheduleReconnect();
    }

    private cleanup(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    private scheduleReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            return;
        }

        const backoffTime = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        this.reconnectAttempts++;

        this.reconnectTimeout = setTimeout(() => {
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            this.connect();
        }, backoffTime);
    }

    private startHeartbeat(): void {
        this.heartbeatInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ action: 'ping' }));
            }
        }, 30000);
    }

    private subscribe(): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const subscriptionMessage = {
                action: 'subscribe',
                channels: ['candles', 'trades', 'ticker'],
                markets: [CONFIG.DEFAULT_PAIR]
            };
            this.ws.send(JSON.stringify(subscriptionMessage));
        }
    }

    private processMessage(data: any): void {
        if (!data.event) {
            return;
        }

        switch (data.event) {
            case 'candle':
                this.tradingManager.updateCandle(data);
                break;
            case 'trade':
                this.tradingManager.updateTrade(data);
                break;
            case 'ticker':
                this.tradingManager.updateTicker(data);
                break;
            case 'pong':
                // Heartbeat response received
                break;
            default:
                console.log('Unhandled WebSocket event:', data.event);
        }
    }
}
