import { ApiCredentials, Balance, Candle, Order, ApiError } from './types';
import { CONFIG } from './config';
import CryptoJS from 'crypto-js';

export class BitvavoAPI {
    private apiKey: string | null = null;
    private apiSecret: string | null = null;
    private isInitialized: boolean = false;
    private rateLimitRemaining: number = 1000;
    private lastRequestTime: number = 0;
    private readonly MIN_REQUEST_INTERVAL = 100; // Minimum time between requests in ms

    async initialize(apiKey: string, apiSecret: string): Promise<boolean> {
        if (!apiKey || !apiSecret) {
            throw new Error('API credentials zijn vereist');
        }
        
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.isInitialized = true;
        
        return this.testConnection();
    }

    private createSignature(timestamp: number, method: string, url: string, body: string = ''): string {
        if (!this.apiSecret) {
            throw new Error('API niet geïnitialiseerd');
        }
        const string = timestamp + method + url + body;
        return CryptoJS.HmacSHA256(string, this.apiSecret).toString();
    }

    private async throttleRequest(): Promise<void> {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
            await new Promise(resolve => 
                setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest)
            );
        }
        
        this.lastRequestTime = Date.now();
    }

    private async makeRequest<T>(endpoint: string, method: string = 'GET', body: any = null): Promise<T> {
        if (!this.isInitialized || !this.apiKey) {
            throw new Error('API niet geïnitialiseerd');
        }

        if (this.rateLimitRemaining <= 0) {
            throw new Error('Rate limit bereikt. Wacht even voordat je nieuwe verzoeken doet.');
        }

        await this.throttleRequest();

        const timestamp = Date.now();
        const url = `${CONFIG.API_URL}${endpoint}`;
        
        const headers: HeadersInit = {
            'BITVAVO-ACCESS-KEY': this.apiKey,
            'BITVAVO-ACCESS-SIGNATURE': this.createSignature(timestamp, method, url, body ? JSON.stringify(body) : ''),
            'BITVAVO-ACCESS-TIMESTAMP': timestamp.toString(),
            'BITVAVO-ACCESS-WINDOW': '10000',
            'Content-Type': 'application/json'
        };

        try {
            const response = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined
            });

            // Update rate limit info
            this.rateLimitRemaining = parseInt(response.headers.get('BITVAVO-RATELIMIT-REMAINING') || '1000');

            if (!response.ok) {
                const errorData = await response.json();
                throw new ApiError(
                    response.status,
                    errorData.error || 'Onbekende API fout',
                    endpoint
                );
            }

            return await response.json() as T;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            console.error('API request error:', error);
            throw new ApiError(500, 'Netwerkfout bij API aanvraag', endpoint);
        }
    }

    async testConnection(): Promise<boolean> {
        try {
            const response = await this.makeRequest<{ time: number }>('/time');
            return !!response.time;
        } catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }

    async getBalance(): Promise<Balance[]> {
        return this.makeRequest<Balance[]>('/balance');
    }

    async getTicker(market: string): Promise<{ last: string }> {
        return this.makeRequest<{ last: string }>(`/ticker/24h?market=${market}`);
    }

    async getCandles(market: string, interval: string = '1h', limit: number = 24): Promise<Candle[]> {
        return this.makeRequest<Candle[]>(`/candles?market=${market}&interval=${interval}&limit=${limit}`);
    }

    async createOrder(order: Order): Promise<Order> {
        // Validate order parameters
        this.validateOrder(order);
        return this.makeRequest<Order>('/order', 'POST', order);
    }

    private validateOrder(order: Order): void {
        if (!order.market || !order.side || !order.orderType) {
            throw new Error('Ongeldige order parameters');
        }

        if (order.orderType === 'limit' && !order.price) {
            throw new Error('Prijs is verplicht voor limit orders');
        }

        if (!order.amount && !order.amountQuote) {
            throw new Error('Amount of amountQuote is verplicht');
        }
    }

    async getOrderHistory(market?: string): Promise<Order[]> {
        const endpoint = market ? `/orders?market=${market}` : '/orders';
        return this.makeRequest<Order[]>(endpoint);
    }

    async cancelOrder(orderId: string, market: string): Promise<void> {
        await this.makeRequest<void>(`/order?orderId=${orderId}&market=${market}`, 'DELETE');
    }

    async getAccountInfo(): Promise<any> {
        return this.makeRequest<any>('/account');
    }

    getRateLimitStatus(): { remaining: number } {
        return { remaining: this.rateLimitRemaining };
    }
}

// Exporteer een singleton instance
export const bitvavo = new BitvavoAPI();

// Helper functies voor API credential management
export async function saveApiCredentials(apiKey: string, apiSecret: string): Promise<void> {
    // Encrypt credentials before storing
    const encryptedKey = CryptoJS.AES.encrypt(apiKey, CONFIG.STORAGE_KEY).toString();
    const encryptedSecret = CryptoJS.AES.encrypt(apiSecret, CONFIG.STORAGE_KEY).toString();
    
    await chrome.storage.sync.set({
        apiKey: encryptedKey,
        apiSecret: encryptedSecret
    });
}

export async function loadApiCredentials(): Promise<ApiCredentials | null> {
    const result = await chrome.storage.sync.get(['apiKey', 'apiSecret']);
    
    if (!result.apiKey || !result.apiSecret) {
        return null;
    }

    try {
        const apiKey = CryptoJS.AES.decrypt(result.apiKey, CONFIG.STORAGE_KEY).toString(CryptoJS.enc.Utf8);
        const apiSecret = CryptoJS.AES.decrypt(result.apiSecret, CONFIG.STORAGE_KEY).toString(CryptoJS.enc.Utf8);
        
        return { apiKey, apiSecret };
    } catch (error) {
        console.error('Error decrypting API credentials:', error);
        return null;
    }
}

export async function validateApiCredentials(apiKey: string, apiSecret: string): Promise<boolean> {
    const api = new BitvavoAPI();
    try {
        return await api.initialize(apiKey, apiSecret);
    } catch (error) {
        console.error('API validation error:', error);
        return false;
    }
}
