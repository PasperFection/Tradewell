import { SecurityConfig as SecurityConfigType } from '../types';

interface SecurityConfigSettings {
    API_SECRET: string;
    RATE_LIMIT: {
        MAX_REQUESTS: number;
        TIME_WINDOW: number;
    };
    TOKEN_EXPIRY: number;
    API_RATE_LIMIT: number;
    API_TIMEOUT: number;
    MAX_RETRY_ATTEMPTS: number;
    WS_HEARTBEAT_INTERVAL: number;
    WS_RECONNECT_DELAY: number;
    WS_MAX_RECONNECT_ATTEMPTS: number;
    INPUT_VALIDATION: {
        PAIR_REGEX: RegExp;
        MAX_ORDER_SIZE_BTC: number;
        MIN_ORDER_SIZE_EUR: number;
        PRICE_DECIMALS: number;
    };
    CONTENT_SECURITY: {
        ALLOWED_DOMAINS: string[];
        CSP_DIRECTIVES: {
            'default-src': string[];
            'script-src': string[];
            'style-src': string[];
            'connect-src': string[];
            'img-src': string[];
            'font-src': string[];
            'object-src': string[];
            'base-uri': string[];
            'frame-ancestors': string[];
            'form-action': string[];
            'upgrade-insecure-requests': string[];
        };
        SANITIZE_OPTIONS: {
            ALLOWED_TAGS: string[];
            ALLOWED_ATTR: string[];
        }
    };
    SECURITY_HEADERS: {
        'Strict-Transport-Security': string;
        'X-Content-Type-Options': string;
        'X-Frame-Options': string;
        'X-XSS-Protection': string;
        'Referrer-Policy': string;
        'Permissions-Policy': string;
    };
    STORAGE: {
        ENCRYPTION_ALGORITHM: string;
        KEY_LENGTH: number;
        SALT_LENGTH: number;
        IV_LENGTH: number;
        KEY_DERIVATION: {
            ITERATIONS: number;
            MEMORY_COST: number;
            PARALLELISM: number
        }
    }
}

const getEnvVar = (key: string, defaultValue: string): string => {
    if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key) || defaultValue;
    }
    return defaultValue;
};

export const SECURITY_CONFIG: SecurityConfigSettings = {
    API_SECRET: getEnvVar('API_SECRET', 'default-secret-key'),
    RATE_LIMIT: {
        MAX_REQUESTS: 100,
        TIME_WINDOW: 60000, // 1 minute in milliseconds
    },
    TOKEN_EXPIRY: 3600000, // 1 hour in milliseconds
    API_RATE_LIMIT: 10, // requests per second
    API_TIMEOUT: 30000, // 30 seconds
    MAX_RETRY_ATTEMPTS: 3,
    WS_HEARTBEAT_INTERVAL: 30000, // 30 seconds
    WS_RECONNECT_DELAY: 5000, // 5 seconds
    WS_MAX_RECONNECT_ATTEMPTS: 5,
    INPUT_VALIDATION: {
        PAIR_REGEX: /^[A-Z0-9]{2,10}-[A-Z0-9]{2,10}$/,
        MAX_ORDER_SIZE_BTC: 1.0,
        MIN_ORDER_SIZE_EUR: 10,
        PRICE_DECIMALS: 8,
    },
    CONTENT_SECURITY: {
        ALLOWED_DOMAINS: [
            'api.bitvavo.com',
            'ws.bitvavo.com',
            'cdn.jsdelivr.net'
        ],
        CSP_DIRECTIVES: {
            'default-src': ["'self'"],
            'script-src': ["'self'", 'cdn.jsdelivr.net'],
            'style-src': ["'self'", 'cdn.jsdelivr.net'],
            'connect-src': ['api.bitvavo.com', 'ws.bitvavo.com'],
            'img-src': ["'self'", 'data:', 'https:'],
            'font-src': ["'self'", 'data:', 'https:'],
            'object-src': ["'none'"],
            'base-uri': ["'self'"],
            'frame-ancestors': ["'none'"],
            'form-action': ["'self'"],
            'upgrade-insecure-requests': []
        },
        SANITIZE_OPTIONS: {
            ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
            ALLOWED_ATTR: ['href', 'target'],
        }
    },
    SECURITY_HEADERS: {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    },
    STORAGE: {
        ENCRYPTION_ALGORITHM: 'AES-GCM',
        KEY_LENGTH: 256,
        SALT_LENGTH: 16,
        IV_LENGTH: 12,
        KEY_DERIVATION: {
            ITERATIONS: 100000,
            MEMORY_COST: 65536,
            PARALLELISM: 1
        }
    }
};
