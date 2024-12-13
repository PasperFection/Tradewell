import { SECURITY_CONFIG } from './SecurityConfig';
import DOMPurify from 'dompurify';

export class SecurityService {
    private static instance: SecurityService;
    private encoder: TextEncoder;
    private decoder: TextDecoder;

    private constructor() {
        this.encoder = new TextEncoder();
        this.decoder = new TextDecoder();
    }

    public static getInstance(): SecurityService {
        if (!SecurityService.instance) {
            SecurityService.instance = new SecurityService();
        }
        return SecurityService.instance;
    }

    public validateTradingPair(pair: string): boolean {
        return SECURITY_CONFIG.INPUT_VALIDATION.PAIR_REGEX.test(pair);
    }

    public validateOrderSize(size: number, pair: string): boolean {
        if (pair.startsWith('BTC')) {
            return size <= SECURITY_CONFIG.INPUT_VALIDATION.MAX_ORDER_SIZE_BTC;
        }
        return size * this.getCurrentPrice(pair) >= SECURITY_CONFIG.INPUT_VALIDATION.MIN_ORDER_SIZE_EUR;
    }

    public sanitizeHTML(input: string): string {
        return DOMPurify.sanitize(input, {
            ALLOWED_TAGS: SECURITY_CONFIG.CONTENT_SECURITY.SANITIZE_OPTIONS.ALLOWED_TAGS,
            ALLOWED_ATTR: SECURITY_CONFIG.CONTENT_SECURITY.SANITIZE_OPTIONS.ALLOWED_ATTR
        });
    }

    public async encryptData(data: string, key: CryptoKey): Promise<string> {
        try {
            const iv = crypto.getRandomValues(new Uint8Array(SECURITY_CONFIG.STORAGE.IV_LENGTH));
            const encodedData = this.encoder.encode(data);

            const encryptedData = await crypto.subtle.encrypt(
                {
                    name: SECURITY_CONFIG.STORAGE.ENCRYPTION_ALGORITHM,
                    iv: iv
                },
                key,
                encodedData
            );

            const encryptedArray = new Uint8Array(encryptedData);
            const resultArray = new Uint8Array(iv.length + encryptedArray.length);
            resultArray.set(iv);
            resultArray.set(encryptedArray, iv.length);

            return btoa(String.fromCharCode(...resultArray));
        } catch (error) {
            console.error('Encryption failed:', error);
            throw new Error('Failed to encrypt data');
        }
    }

    public async decryptData(encryptedData: string, key: CryptoKey): Promise<string> {
        try {
            const data = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
            const iv = data.slice(0, SECURITY_CONFIG.STORAGE.IV_LENGTH);
            const ciphertext = data.slice(SECURITY_CONFIG.STORAGE.IV_LENGTH);

            const decryptedData = await crypto.subtle.decrypt(
                {
                    name: SECURITY_CONFIG.STORAGE.ENCRYPTION_ALGORITHM,
                    iv: iv
                },
                key,
                ciphertext
            );

            return this.decoder.decode(decryptedData);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Failed to decrypt data');
        }
    }

    private getCurrentPrice(pair: string): number {
        // Implement price fetching logic here
        return 0; // Placeholder
    }

    public validateAPIResponse(response: Response): Promise<Response> {
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        return Promise.resolve(response);
    }

    public rateLimit<T>(fn: (...args: any[]) => Promise<T>, limit: number): (...args: any[]) => Promise<T> {
        const queue: Array<{ resolve: (value: T) => void, reject: (reason?: any) => void }> = [];
        let lastCall = 0;

        return async (...args: any[]): Promise<T> => {
            const now = Date.now();
            const timeSinceLastCall = now - lastCall;
            const delay = Math.max(0, limit - timeSinceLastCall);

            return new Promise((resolve, reject) => {
                queue.push({ resolve, reject });

                setTimeout(async () => {
                    if (queue[0]?.resolve === resolve) {
                        queue.shift();
                        lastCall = Date.now();
                        try {
                            const result = await fn(...args);
                            resolve(result);
                        } catch (error) {
                            reject(error);
                        }
                    }
                }, delay);
            });
        };
    }
}
