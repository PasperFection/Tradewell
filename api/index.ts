import { BitvavoAPI, Order, Balance, Config } from '../types';
import { CONFIG } from '../config';

class Bitvavo implements BitvavoAPI {
    private apiKey: string;
    private apiSecret: string;
    private baseUrl = 'https://api.bitvavo.com/v2';

    constructor(config: Config = CONFIG) {
        this.apiKey = config.API_KEY;
        this.apiSecret = config.API_SECRET;
    }

    private async request(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
        const url = `${this.baseUrl}${endpoint}`;
        const timestamp = Date.now();
        const options: RequestInit = {
            method,
            headers: {
                'BITVAVO-ACCESS-KEY': this.apiKey,
                'BITVAVO-ACCESS-TIMESTAMP': timestamp.toString(),
                'Content-Type': 'application/json'
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        // Create signature
        const signature = this.createSignature(timestamp, method, endpoint, body);
        (options.headers as any)['BITVAVO-ACCESS-SIGNATURE'] = signature;

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    private createSignature(timestamp: number, method: string, endpoint: string, body?: any): string {
        const message = timestamp + method + endpoint + (body ? JSON.stringify(body) : '');
        // Use crypto-js or similar library to create HMAC signature
        // This is a placeholder - implement actual HMAC-SHA256 signing
        return 'signature_placeholder';
    }

    async getBalance(currency?: string): Promise<Balance[]> {
        const endpoint = '/balance';
        const response = await this.request(endpoint);
        return currency 
            ? response.filter((b: Balance) => b.symbol === currency)
            : response;
    }

    async getTicker(market: string): Promise<{ last: string }> {
        const endpoint = `/ticker/price/${market}`;
        return this.request(endpoint);
    }

    async placeOrder(market: string, side: 'buy' | 'sell', amount: string, price?: string): Promise<Order> {
        const endpoint = '/order';
        const order: Order = {
            market,
            side,
            orderType: price ? 'limit' : 'market',
            amount
        };

        if (price) {
            order.price = price;
        }

        return this.request(endpoint, 'POST', order);
    }

    async getOrders(market: string): Promise<Order[]> {
        const endpoint = `/orders?market=${market}`;
        return this.request(endpoint);
    }

    async cancelOrder(market: string, orderId: string): Promise<void> {
        const endpoint = '/order';
        await this.request(endpoint, 'DELETE', { market, orderId });
    }

    async getAccountInfo(): Promise<any> {
        const endpoint = '/account';
        return this.request(endpoint);
    }
}

export const bitvavo = new Bitvavo();
