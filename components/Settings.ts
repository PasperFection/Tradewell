import { saveApiCredentials, validateApiCredentials } from '../api';

export class Settings {
    private container: HTMLElement;
    private apiKeyInput: HTMLInputElement;
    private apiSecretInput: HTMLInputElement;
    private notificationEnabled: HTMLInputElement;
    private autoTradeEnabled: HTMLInputElement;
    private riskLevel: HTMLSelectElement;

    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'settings-container';
        this.initializeUI();
        this.loadSettings();
    }

    private initializeUI(): void {
        this.container.innerHTML = `
            <div class="settings-section">
                <h2>API Instellingen</h2>
                <div class="api-credentials">
                    <div class="input-group">
                        <label for="apiKey">API Key</label>
                        <input type="password" id="apiKey" placeholder="Voer je Bitvavo API key in" />
                    </div>
                    <div class="input-group">
                        <label for="apiSecret">API Secret</label>
                        <input type="password" id="apiSecret" placeholder="Voer je Bitvavo API secret in" />
                    </div>
                    <button id="saveApi" class="primary-button">Opslaan</button>
                    <div id="apiStatus" class="status-indicator"></div>
                </div>
            </div>

            <div class="settings-section">
                <h2>Trading Instellingen</h2>
                <div class="trading-settings">
                    <div class="input-group">
                        <label>
                            <input type="checkbox" id="autoTrade" />
                            Automatisch handelen inschakelen
                        </label>
                    </div>
                    <div class="input-group">
                        <label for="riskLevel">Risico niveau</label>
                        <select id="riskLevel">
                            <option value="low">Laag</option>
                            <option value="medium">Gemiddeld</option>
                            <option value="high">Hoog</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h2>Notificaties</h2>
                <div class="notification-settings">
                    <div class="input-group">
                        <label>
                            <input type="checkbox" id="notifications" />
                            Notificaties inschakelen
                        </label>
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        const saveButton = this.container.querySelector('#saveApi');
        this.apiKeyInput = this.container.querySelector('#apiKey') as HTMLInputElement;
        this.apiSecretInput = this.container.querySelector('#apiSecret') as HTMLInputElement;
        this.notificationEnabled = this.container.querySelector('#notifications') as HTMLInputElement;
        this.autoTradeEnabled = this.container.querySelector('#autoTrade') as HTMLInputElement;
        this.riskLevel = this.container.querySelector('#riskLevel') as HTMLSelectElement;

        saveButton?.addEventListener('click', () => this.saveSettings());
        
        // Auto-save for other settings
        [this.notificationEnabled, this.autoTradeEnabled, this.riskLevel].forEach(element => {
            element?.addEventListener('change', () => this.saveSettings());
        });
    }

    private async saveSettings(): Promise<void> {
        const apiKey = this.apiKeyInput.value;
        const apiSecret = this.apiSecretInput.value;

        if (apiKey && apiSecret) {
            try {
                // Validate credentials before saving
                const isValid = await validateApiCredentials(apiKey, apiSecret);
                if (isValid) {
                    await saveApiCredentials(apiKey, apiSecret);
                    this.showStatus('API credentials opgeslagen en gevalideerd', 'success');
                } else {
                    this.showStatus('Ongeldige API credentials', 'error');
                    return;
                }
            } catch (error) {
                this.showStatus('Error bij opslaan van credentials', 'error');
                return;
            }
        }

        // Save other settings
        chrome.storage.sync.set({
            notifications: this.notificationEnabled.checked,
            autoTrade: this.autoTradeEnabled.checked,
            riskLevel: this.riskLevel.value
        }, () => {
            this.showStatus('Instellingen opgeslagen', 'success');
        });
    }

    private async loadSettings(): Promise<void> {
        chrome.storage.sync.get([
            'notifications',
            'autoTrade',
            'riskLevel'
        ], (result) => {
            this.notificationEnabled.checked = result.notifications ?? false;
            this.autoTradeEnabled.checked = result.autoTrade ?? false;
            this.riskLevel.value = result.riskLevel ?? 'medium';
        });
    }

    private showStatus(message: string, type: 'success' | 'error'): void {
        const statusElement = this.container.querySelector('#apiStatus');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status-indicator ${type}`;
            setTimeout(() => {
                statusElement.textContent = '';
                statusElement.className = 'status-indicator';
            }, 3000);
        }
    }

    public getElement(): HTMLElement {
        return this.container;
    }
}
