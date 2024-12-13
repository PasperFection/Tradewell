import { Order, Trade } from '../types';

export interface BitvavoAPI {
    placeOrder(market: string, side: 'buy' | 'sell', amount: number, price?: number): Promise<Order>;
    getBalance(symbol: string): Promise<{ available: number; inOrder: number }>;
    getTicker(market: string): Promise<{ lastPrice: number; volume: number }>;
    getTrades(market: string, limit?: number): Promise<Trade[]>;
    getCandles(market: string, interval: string, limit?: number): Promise<[number, number, number, number, number, number][]>;
    getMarkets(): Promise<{ market: string; status: string }[]>;
    getBook(market: string, depth?: number): Promise<{ bids: [string, string][]; asks: [string, string][] }>;
    getTime(): Promise<{ time: number }>;
    cancelOrder(market: string, orderId: string): Promise<Order>;
    getOrder(market: string, orderId: string): Promise<Order>;
    getOrders(market?: string, limit?: number): Promise<Order[]>;
    getOpenOrders(market?: string): Promise<Order[]>;
}
