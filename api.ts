import { Balance, Candle, Order, ApiError } from './types';
import * as CryptoJS from 'crypto-js';
import { CredentialService } from './services/CredentialService';

type RequestBody = Record<string, string | number | boolean | null | undefined>;

interface OrderRequest extends RequestBody {
    market: string;
    side: 'buy' | 'sell';
    amount: string;
    orderType: 'limit' | 'market';
    price?: string | null;
}

interface AccountInfo {
    fees: {
        taker: string;
        maker: string;
        volume: string;
    };
    trading: {
        enabled: boolean;
    };
}

export class BitvavoAPI {
    private apiKey: string | null = null;
    private apiSecret: string | null = null;
    private credentialService: CredentialService;
    private static instance: BitvavoAPI | null = null;
    private rateLimitRemaining: number = 1000;
    private lastRequestTime: number = 0;
    private readonly MIN_REQUEST_INTERVAL = 100; // Minimum time between requests in ms

    private constructor() {
        this.credentialService = CredentialService.getInstance();
    }

    public static getInstance(): BitvavoAPI {
        if (!BitvavoAPI.instance) {
            BitvavoAPI.instance = new BitvavoAPI();
        }
        return BitvavoAPI.instance;
    }

    public async initialize(): Promise<void> {
        try {
            const credentials = await this.credentialService.getCredentials();
            this.apiKey = credentials.apiKey;
            this.apiSecret = credentials.apiSecret;
        } catch (error) {
            console.error('Failed to initialize API:', error);
            throw new Error('Failed to initialize API credentials');
        }
    }

    public async setCredentials(apiKey: string, apiSecret: string): Promise<void> {
        try {
            await this.credentialService.storeCredentials(apiKey, apiSecret);
            this.apiKey = apiKey;
            this.apiSecret = apiSecret;
        } catch (error) {
            console.error('Failed to set credentials:', error);
            throw new Error('Failed to set API credentials');
        }
    }

    private createSignature(timestamp: number, method: string, url: string, body: string = ''): string {
        if (!this.apiSecret) throw new Error('API Secret not set');
        
        const message = timestamp + method + url + body;
        return CryptoJS.HmacSHA256(message, this.apiSecret).toString();
    }

    private async throttleRequest(): Promise<void> {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
            await new Promise(resolve => setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest));
        }
        this.lastRequestTime = Date.now();
    }

    private async request<T>(method: string, endpoint: string, body: RequestBody | null = null): Promise<T> {
        if (!this.apiKey || !this.apiSecret) {
            throw new Error('API credentials not set');
        }

        await this.throttleRequest();

        const timestamp = Date.now();
        const url = `https://api.bitvavo.com/v2${endpoint}`;
        const bodyString = body ? JSON.stringify(body) : '';
        
        const headers: HeadersInit = {
            'Bitvavo-Access-Key': this.apiKey,
            'Bitvavo-Access-Signature': this.createSignature(timestamp, method, endpoint, bodyString),
            'Bitvavo-Access-Timestamp': timestamp.toString(),
            'Content-Type': 'application/json'
        };

        try {
            const response = await fetch(url, {
                method,
                headers,
                body: bodyString || undefined
            });

            if (!response.ok) {
                const error = await response.json() as { errorCode: string; error: string };
                throw new ApiError(error.errorCode, error.error, endpoint);
            }

            return response.json() as Promise<T>;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new Error('API request failed: ' + (error instanceof Error ? error.message : String(error)));
        }
    }

    public async getBalance(currency?: string): Promise<Balance[]> {
        const endpoint = currency ? `/balance?symbol=${currency}` : '/balance';
        return this.request<Balance[]>('GET', endpoint);
    }

    public async getTicker(market: string): Promise<{ last: string }> {
        return this.request<{ last: string }>('GET', `/ticker/price?market=${market}`);
    }

    public async getCandles(market: string, interval: string = '1h', limit: number = 24): Promise<Candle[]> {
        const params: RequestBody = {
            market,
            interval,
            limit
        };
        return this.request<Candle[]>('GET', `/candles`, params);
    }

    public async placeOrder(
        market: string,
        side: 'buy' | 'sell',
        amount: string,
        price?: string
    ): Promise<Order> {
        const orderRequest: OrderRequest = {
            market,
            side,
            amount,
            orderType: price ? 'limit' : 'market'
        };

        if (price) {
            orderRequest.price = price;
        }

        return this.request<Order>('POST', '/order', orderRequest);
    }

    public async getOrderHistory(market?: string): Promise<Order[]> {
        const params: RequestBody = market ? { market } : {};
        return this.request<Order[]>('GET', '/orders', params);
    }

    public async cancelOrder(orderId: string, market: string): Promise<void> {
        const params: RequestBody = {
            orderId,
            market
        };
        await this.request<void>('DELETE', '/order', params);
    }

    public async getAccountInfo(): Promise<AccountInfo> {
        return this.request<AccountInfo>('GET', '/account');
    }

    public getRateLimitStatus(): { remaining: number } {
        return { remaining: this.rateLimitRemaining };
    }
}
