# Tradewell - Bitvavo Trading Bot

Een veilige en gebruiksvriendelijke browser-extensie voor geautomatiseerd handelen op het Bitvavo platform.

## Functionaliteiten

- 📈 Meerdere handelsstrategieën (RSI, MACD, Volume Weighted)
- 🔒 Veilige API-integratie
- ⚡ Real-time prijsupdates
- 📊 Uitgebreid dashboard met portfolio analyse
- 📱 Responsieve en moderne UI
- 📈 Geavanceerde technische indicatoren
- 🔔 Real-time notificaties
- ⚙️ Aanpasbare handelsinstellingen
- 🛡️ Ingebouwde veiligheidsmaatregelen

## Installatie

1. Clone deze repository
2. Open Chrome en ga naar `chrome://extensions/`
3. Schakel de "Ontwikkelaarsmodus" in
4. Klik op "Uitgepakte extensie laden"
5. Selecteer de `src` map van dit project

## Configuratie

1. Maak een API-sleutel aan op je Bitvavo account
2. Open de extensie en klik op "Instellingen"
3. Voer je API-credentials in
4. Kies je gewenste handelsstrategie
5. Pas de handelsinstellingen aan naar wens

## Veiligheid

- API-credentials worden veilig opgeslagen
- Strikte handelslimieten
- Stop-loss bescherming
- Uitgebreide foutafhandeling

## Ontwikkeling

### Projectstructuur

```
src/
├── manifest.json
├── popup.html
├── dashboard.html
├── css/
│   ├── styles.css
│   └── dashboard.css
├── ts/
│   ├── api.ts
│   ├── background.ts
│   ├── config.ts
│   ├── popup.ts
│   ├── dashboard.ts
│   └── strategies/
│       └── advanced.ts
├── js/
│   ├── api.js
│   ├── background.js
│   ├── config.js
│   ├── popup.js
│   └── strategies.js
└── images/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Bouwen en Testen

1. Maak wijzigingen in de broncode
2. Test de extensie lokaal
3. Update de versie in `manifest.json`
4. Update `CHANGELOG.md`

## Bijdragen

1. Fork het project
2. Maak een feature branch
3. Commit je wijzigingen
4. Push naar de branch
5. Open een Pull Request

## Licentie

Dit project is gelicentieerd onder de MIT-licentie.

## Disclaimer

Deze trading bot is voor educatieve doeleinden. Handel altijd verantwoord en wees je bewust van de risico's van cryptocurrency trading.
