import { createHash, createHmac } from 'node:crypto';
import * as CryptoJS from 'crypto-js';
import { SECURITY_CONFIG } from './SecurityConfig';
import DOMPurify from 'dompurify';

interface KeyDerivationOptions {
    keySize: number;
    iterations: number;
}

export class SecurityService {
    private static instance: SecurityService | null = null;
    private readonly SECRET_KEY: string;
    private readonly SALT: string;
    private readonly KEY_DERIVATION_OPTIONS: KeyDerivationOptions;

    private constructor() {
        this.SECRET_KEY = SECURITY_CONFIG.API_SECRET;
        this.SALT = SECURITY_CONFIG.STORAGE.ENCRYPTION_ALGORITHM;
        this.KEY_DERIVATION_OPTIONS = {
            keySize: 256 / 32,
            iterations: SECURITY_CONFIG.STORAGE.KEY_DERIVATION.ITERATIONS
        };
    }

    public static getInstance(): SecurityService {
        if (!SecurityService.instance) {
            SecurityService.instance = new SecurityService();
        }
        return SecurityService.instance;
    }

    public async encryptData(data: string): Promise<string> {
        try {
            const key = await this.deriveKey(this.SECRET_KEY);
            return CryptoJS.AES.encrypt(data, key).toString();
        } catch (error) {
            console.error('Encryption failed:', error);
            throw new Error('Failed to encrypt data');
        }
    }

    public async decryptData(encryptedData: string): Promise<string> {
        try {
            const key = await this.deriveKey(this.SECRET_KEY);
            const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
            return decrypted.toString(CryptoJS.enc.Utf8);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Failed to decrypt data');
        }
    }

    private async deriveKey(secret: string): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                const key = CryptoJS.PBKDF2(
                    secret,
                    this.SALT,
                    this.KEY_DERIVATION_OPTIONS
                );
                resolve(key.toString());
            } catch (error) {
                reject(new Error('Key derivation failed'));
            }
        });
    }

    public verifyHMAC(message: string, signature: string | null, secret: string): boolean {
        if (!signature) return false;
        
        const expectedHmac = createHmac('sha256', secret)
            .update(message)
            .digest('hex');
            
        return this.safeCompare(signature, expectedHmac);
    }

    private safeCompare(a: string, b: string): boolean {
        if (a.length !== b.length) return false;
        return createHash('sha256')
            .update(a)
            .digest('hex') === createHash('sha256')
            .update(b)
            .digest('hex');
    }

    public sanitizeInput(input: string): string {
        return DOMPurify.sanitize(input, SECURITY_CONFIG.CONTENT_SECURITY.SANITIZE_OPTIONS);
    }

    public secureLog(message: string, data?: unknown): void {
        const sanitizedMessage = this.sanitizeInput(message);
        const sanitizedData = data ? this.sanitizeInput(JSON.stringify(data)) : '';
        console.log(`[Security] ${sanitizedMessage}`, sanitizedData);
    }
}
