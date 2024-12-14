# Tradewell - Bitvavo Trading Bot (Chrome extensie)

Een veilige en gebruiksvriendelijke browser-extensie voor geautomatiseerd handelen op het Bitvavo platform.

## Functionaliteiten

### Trading Strategieën
- 📊 Traditionele Strategieën:
  - RSI (Relative Strength Index)
  - MACD (Moving Average Convergence Divergence)
  - Volume Weighted Analysis
- 🤖 Machine Learning Strategie:
  - Multi-indicator analyse
  - Adaptieve signalen
  - Pattern recognition
  - Real-time validatie

### Portfolio Management
- 📈 Dynamische Allocatie:
  - Correlatie-gebaseerde posities
  - Volatiliteit aanpassingen
  - Automatische herbalancering
- 🛡️ Risico Management:
  - Asset diversificatie
  - Exposure limieten
  - Drawdown bescherming
  - Portfolio gezondheid monitoring

### Backtesting & Analyse
- 📉 Uitgebreide Backtesting:
  - Performance metrics
  - Risk-adjusted returns
  - Transactiekosten simulatie
- 📊 Trading Statistieken:
  - Sharpe ratio
  - Maximum drawdown
  - Win/loss ratio
  - Profit factor

### Veiligheid
- 🔒 API Beveiliging:
  - Veilige credential opslag met Supabase
  - Request signing met HMAC
  - Rate limiting
  - Row Level Security (RLS)
- 🛡️ Data Bescherming:
  - End-to-end encryptie
  - Secure key derivatie (PBKDF2)
  - XSS preventie met DOMPurify
  - Timing-safe comparisons
- 🔐 Configuratie:
  - Type-safe security configuratie
  - Veilige opslag van geheime sleutels
  - Geïsoleerde gebruikers data
  - Automatische timestamp tracking

## Installatie

1. Clone deze repository
2. Open Chrome en ga naar `chrome://extensions/`
3. Schakel de "Ontwikkelaarsmodus" in
4. Klik op "Uitgepakte extensie laden"
5. Selecteer de `src` map van dit project

## Configuratie

### Supabase Setup
1. Maak een nieuw project aan op [Supabase](https://supabase.com)
2. Kopieer de project URL en anonieme key
3. Maak een `.env` bestand aan in de root:
   ```env
   SUPABASE_URL=your_project_url
   SUPABASE_ANON_KEY=your_anon_key
   ```

### Veiligheids Setup
1. Configureer de security instellingen:
   ```typescript
   // SecurityConfig.ts
   export const SECURITY_CONFIG: SecurityConfigType = {
     API_SECRET: process.env.API_SECRET,
     STORAGE: {
       ENCRYPTION_ALGORITHM: 'aes-256-gcm',
       KEY_DERIVATION: {
         ITERATIONS: 100000,
         MEMORY_COST: 4096,
         PARALLELISM: 1
       }
     }
     // ... andere security opties
   };
   ```

2. Stel de environment variables in:
   ```env
   API_SECRET=your-secret-key
   SUPABASE_URL=your-project-url
   SUPABASE_ANON_KEY=your-anon-key
   ```

3. Voer de database migraties uit:
   ```bash
   npm run db:migrate
   ```

### API Setup
1. Maak een API-sleutel aan op je Bitvavo account
2. Open de extensie en klik op "Instellingen"
3. Voer je API-credentials in
4. Configureer de gewenste veiligheidsinstellingen

### Trading Setup
1. Kies je gewenste trading strategie:
   - Traditionele indicators (RSI, MACD, Volume)
   - Machine Learning strategie
   - Custom combinaties
2. Stel risico parameters in:
   - Maximum positie grootte
   - Stop-loss niveaus
   - Take-profit targets
3. Configureer portfolio limieten:
   - Asset allocatie
   - Diversificatie regels
   - Rebalancing triggers

## Gebruik

### Dashboard
- Real-time portfolio overzicht
- Open posities monitoring
- Performance statistieken
- Risk metrics

### Backtesting
1. Selecteer een strategie
2. Kies historische data periode
3. Stel parameters in
4. Analyseer resultaten:
   - Performance metrics
   - Risk statistics
   - Trade log
   - Equity curve

### Portfolio Management
1. Bekijk asset allocaties
2. Monitor correlaties
3. Check risico scores
4. Volg rebalancing suggesties

## Development

### Projectstructuur
```
src/
├── manifest.json
├── popup.html
├── dashboard.html
├── css/
├── ts/
│   ├── api/
│   ├── strategies/
│   │   ├── RSIStrategy.ts
│   │   ├── MACDStrategy.ts
│   │   └── MLStrategy.ts
│   ├── backtesting/
│   │   └── BacktestEngine.ts
│   ├── risk/
│   │   └── PortfolioManager.ts
│   └── security/
└── images/
```

### Bouwen
1. Installeer dependencies: `npm install`
2. Build project: `npm run build`
3. Test: `npm run test`
4. Lint: `npm run lint`

## Disclaimer

Deze trading bot is voor educatieve doeleinden. Handel altijd verantwoord en wees je bewust van de risico's van cryptocurrency trading.
