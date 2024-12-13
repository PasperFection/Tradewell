import { WebSocketManager } from './websocket/WebSocketManager';
import { TradingManager } from './trading/TradingManager';
import { PerformanceMonitor } from './performance/PerformanceMonitor';
import { RiskManager } from './risk/RiskManager';
import { StrategyFactory } from './strategies/StrategyFactory';
import { loadApiCredentials } from './api';
import { bitvavo } from './api';
import { CONFIG } from './config';

// Service Worker setup
const ALARM_NAME = 'tradewellUpdate';
let wsManager: WebSocketManager | null = null;
let tradingManager: TradingManager | null = null;
let performanceMonitor: PerformanceMonitor | null = null;
let riskManager: RiskManager | null = null;

// Initialize all components
async function initializeComponents() {
    try {
        const credentials = await loadApiCredentials();
        if (!credentials) {
            console.log('No API credentials found');
            return;
        }

        // Initialize monitors and managers
        performanceMonitor = new PerformanceMonitor();
        await performanceMonitor.initialize();

        riskManager = new RiskManager(CONFIG);
        
        // Load user settings
        const settingsResult = await chrome.storage.sync.get('userSettings');
        const userSettings = settingsResult.userSettings || {};

        tradingManager = new TradingManager(bitvavo, riskManager, CONFIG, {
            maxOrderSize: CONFIG.SAFETY.maxOrderSize,
            maxDailyTrades: CONFIG.SAFETY.maxDailyTrades,
            stopLossPercentage: CONFIG.SAFETY.stopLossPercentage,
            takeProfitPercentage: CONFIG.SAFETY.takeProfitPercentage
        });

        // Initialize trading strategies
        StrategyFactory.initialize();

        // Start WebSocket connection
        wsManager = new WebSocketManager(tradingManager);
        wsManager.connect();

        console.log('All components initialized successfully');
    } catch (err) {
        console.error('Error initializing components:', err instanceof Error ? err.message : String(err));
    }
}

// Service Worker message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    (async () => {
        try {
            switch (request.action) {
                case 'showNotification':
                    await chrome.notifications.create({
                        type: 'basic',
                        iconUrl: 'images/icon48.png',
                        title: 'Tradewell',
                        message: request.message
                    });
                    sendResponse({ success: true });
                    break;

                case 'getPerformanceMetrics':
                    if (performanceMonitor) {
                        const metrics = performanceMonitor.getMetrics();
                        sendResponse({ success: true, data: metrics });
                    } else {
                        sendResponse({ success: false, error: 'Performance monitor not initialized' });
                    }
                    break;

                case 'getRiskMetrics':
                    if (riskManager) {
                        const metrics = await riskManager.getRiskMetrics();
                        sendResponse({ success: true, data: metrics });
                    } else {
                        sendResponse({ success: false, error: 'Risk manager not initialized' });
                    }
                    break;

                case 'updateStrategy':
                    if (tradingManager) {
                        tradingManager.setStrategy(request.strategyName);
                        sendResponse({ success: true });
                    } else {
                        sendResponse({ success: false, error: 'Trading manager not initialized' });
                    }
                    break;

                case 'updateSettings':
                    if (tradingManager) {
                        tradingManager.updateSettings(request.settings);
                        await chrome.storage.sync.set({ userSettings: request.settings });
                        sendResponse({ success: true });
                    } else {
                        sendResponse({ success: false, error: 'Trading manager not initialized' });
                    }
                    break;

                case 'resetEmergencyShutdown':
                    if (riskManager) {
                        riskManager.resetEmergencyShutdown();
                        sendResponse({ success: true });
                    } else {
                        sendResponse({ success: false, error: 'Risk manager not initialized' });
                    }
                    break;

                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (err) {
            console.error('Error handling message:', err instanceof Error ? err.message : String(err));
            sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) });
        }
    })();
    return true; // Indicates async response
});

// Alarm handling for periodic updates
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
        if (performanceMonitor) {
            performanceMonitor.updateMetrics();
        }
    }
});

// Service Worker activation
chrome.runtime.onInstalled.addListener(() => {
    // Set up periodic updates
    chrome.alarms.create(ALARM_NAME, {
        periodInMinutes: 1 // Update every minute
    });

    // Initialize components
    initializeComponents();
});
