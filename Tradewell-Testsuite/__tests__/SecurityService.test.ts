import { SecurityService } from '../security/SecurityService';
import type { AES, lib } from 'crypto-js';

// Mock CryptoJS
const mockEncrypt = jest.fn();
const mockDecrypt = jest.fn();
jest.mock('crypto-js', () => ({
    AES: {
        encrypt: (_data: string, _key: string) => {
            return {
                toString: () => mockEncrypt(_data)
            };
        },
        decrypt: (_data: string, _key: string) => {
            return {
                toString: () => mockDecrypt(_data)
            };
        }
    },
    PBKDF2: (_secret: string, _salt: string, _options: lib.WordArray) => {
        return {
            toString: () => 'derived-key'
        };
    },
    enc: {
        Utf8: 'utf8'
    }
}));

// Mock DOMPurify
jest.mock('dompurify', () => ({
    __esModule: true,
    default: {
        sanitize: jest.fn((input: string) => {
            // Simple mock implementation that removes script tags
            return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        })
    }
}));

// Mock console.log for secureLog testing
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

describe('SecurityService', () => {
    let securityService: SecurityService;

    beforeEach(() => {
        securityService = SecurityService.getInstance();
        jest.clearAllMocks();
        
        // Setup default mock implementations
        mockEncrypt.mockImplementation((data) => `encrypted:${data}`);
        mockDecrypt.mockImplementation((data) => data.replace('encrypted:', ''));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Singleton Pattern', () => {
        it('should return the same instance when getInstance is called multiple times', () => {
            const instance1 = SecurityService.getInstance();
            const instance2 = SecurityService.getInstance();
            expect(instance1).toBe(instance2);
        });
    });

    describe('encryptData', () => {
        it('should encrypt data successfully', async () => {
            const testData = 'sensitive-data';
            const encrypted = await securityService.encryptData(testData);
            
            expect(encrypted).toBeTruthy();
            expect(typeof encrypted).toBe('string');
            expect(encrypted).not.toBe(testData);
            expect(encrypted).toBe(`encrypted:${testData}`);
        });

        it('should encrypt same data to different ciphertexts', async () => {
            mockEncrypt
                .mockImplementationOnce((data) => `encrypted1:${data}`)
                .mockImplementationOnce((data) => `encrypted2:${data}`);

            const testData = 'sensitive-data';
            const encrypted1 = await securityService.encryptData(testData);
            const encrypted2 = await securityService.encryptData(testData);
            
            expect(encrypted1).not.toBe(encrypted2);
        });

        it('should handle empty string', async () => {
            const encrypted = await securityService.encryptData('');
            expect(encrypted).toBeTruthy();
            expect(typeof encrypted).toBe('string');
            expect(encrypted).toBe('encrypted:');
        });

        it('should throw error when encryption fails', async () => {
            mockEncrypt.mockImplementation(() => {
                throw new Error('Encryption failed');
            });

            await expect(securityService.encryptData('test')).rejects.toThrow('Failed to encrypt data');
        });
    });

    describe('decryptData', () => {
        it('should decrypt previously encrypted data', async () => {
            const originalData = 'test-data-123';
            const encrypted = await securityService.encryptData(originalData);
            const decrypted = await securityService.decryptData(encrypted);
            
            expect(decrypted).toBe(originalData);
        });

        it('should handle empty encrypted string', async () => {
            const encrypted = await securityService.encryptData('');
            const decrypted = await securityService.decryptData(encrypted);
            expect(decrypted).toBe('');
        });

        it('should throw error when decryption fails', async () => {
            mockDecrypt.mockImplementation(() => {
                throw new Error('Decryption failed');
            });

            await expect(securityService.decryptData('invalid-data')).rejects.toThrow('Failed to decrypt data');
        });
    });

    describe('verifyHMAC', () => {
        const testMessage = 'test-message';
        const testSecret = 'test-secret';

        it('should verify valid HMAC signatures', () => {
            const validSignature = require('crypto')
                .createHmac('sha256', testSecret)
                .update(testMessage)
                .digest('hex');

            const result = securityService.verifyHMAC(testMessage, validSignature, testSecret);
            expect(result).toBe(true);
        });

        it('should reject invalid HMAC signatures', () => {
            const invalidSignature = 'invalid-signature';
            const result = securityService.verifyHMAC(testMessage, invalidSignature, testSecret);
            expect(result).toBe(false);
        });

        it('should reject null signatures', () => {
            const result = securityService.verifyHMAC(testMessage, null, testSecret);
            expect(result).toBe(false);
        });

        it('should reject signatures of different length', () => {
            const validSignature = require('crypto')
                .createHmac('sha256', testSecret)
                .update(testMessage)
                .digest('hex');
            const truncatedSignature = validSignature.substring(0, validSignature.length - 1);
            
            const result = securityService.verifyHMAC(testMessage, truncatedSignature, testSecret);
            expect(result).toBe(false);
        });
    });

    describe('sanitizeInput', () => {
        it('should remove script tags from HTML input', () => {
            const dirtyInput = '<script>alert("xss")</script>Hello<script>console.log("test")</script>';
            const sanitized = securityService.sanitizeInput(dirtyInput);
            
            expect(sanitized).not.toContain('<script>');
            expect(sanitized).not.toContain('</script>');
            expect(sanitized).toBe('Hello');
        });

        it('should handle empty input', () => {
            const sanitized = securityService.sanitizeInput('');
            expect(sanitized).toBe('');
        });

        it('should preserve safe HTML content', () => {
            const safeInput = '<p>Hello <b>World</b></p>';
            const sanitized = securityService.sanitizeInput(safeInput);
            expect(sanitized).toBe(safeInput);
        });
    });

    describe('secureLog', () => {
        it('should log sanitized message and data', () => {
            const message = '<script>alert("xss")</script>Test Message';
            const data = { key: '<script>console.log("test")</script>value' };
            
            securityService.secureLog(message, data);
            
            expect(mockConsoleLog).toHaveBeenCalledWith(
                '[Security] Test Message',
                '{"key":"value"}'
            );
        });

        it('should handle undefined data', () => {
            const message = 'Test Message';
            
            securityService.secureLog(message);
            
            expect(mockConsoleLog).toHaveBeenCalledWith(
                '[Security] Test Message',
                ''
            );
        });

        it('should sanitize both message and data', () => {
            const message = '<script>alert("xss")</script>Test';
            const data = '<script>console.log("test")</script>';
            
            securityService.secureLog(message, data);
            
            expect(mockConsoleLog).toHaveBeenCalledWith(
                '[Security] Test',
                '""'
            );
        });
    });
});
