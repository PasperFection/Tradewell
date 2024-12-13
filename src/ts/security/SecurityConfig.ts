import { SecurityConfig } from '../types';

export const SECURITY_CONFIG: SecurityConfig = {
    // API Security
    API_RATE_LIMIT: 10, // requests per second
    API_TIMEOUT: 30000, // 30 seconds
    MAX_RETRY_ATTEMPTS: 3,
    
    // WebSocket Security
    WS_HEARTBEAT_INTERVAL: 30000, // 30 seconds
    WS_RECONNECT_DELAY: 5000, // 5 seconds
    WS_MAX_RECONNECT_ATTEMPTS: 5,
    
    // Data Validation
    INPUT_VALIDATION: {
        PAIR_REGEX: /^[A-Z0-9]{2,10}-[A-Z0-9]{2,10}$/,
        MAX_ORDER_SIZE_BTC: 1.0,
        MIN_ORDER_SIZE_EUR: 10,
        PRICE_DECIMALS: 8,
    },
    
    // XSS Prevention
    CONTENT_SECURITY: {
        ALLOWED_DOMAINS: [
            'api.bitvavo.com',
            'ws.bitvavo.com',
            'cdn.jsdelivr.net'
        ],
        SANITIZE_OPTIONS: {
            ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
            ALLOWED_ATTR: ['href', 'target'],
        }
    },
    
    // Storage Security
    STORAGE: {
        ENCRYPTION_ALGORITHM: 'AES-GCM',
        KEY_LENGTH: 256,
        SALT_LENGTH: 16,
        IV_LENGTH: 12,
    }
};
