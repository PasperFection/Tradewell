### Stappenplan voor het bouwen van de Bitvavo Trading Bot
Hier is een **stappenplan en checklist** voor het bouwen van de **Bitvavo Trading Bot** in de vorm van een browserextensie:

#### **Stap 1: Verkrijg een API-sleutel van Bitvavo**
1. **Log in op je Bitvavo-account.**
2. Ga naar [Bitvavo API](https://www.bitvavo.com/nl/api).
3. Maak een nieuwe API-sleutel aan. Je moet de volgende machtigingen instellen:
   - **Lees** je accountinformatie (voor balans).
   - **Handelen** voor het uitvoeren van koop- en verkooporders.
4. Bewaar zowel de **API-sleutel** als de **API-geheim** veilig.

#### **Stap 2: Maak de map voor je extensie**
1. **Maak een nieuwe map** voor de extensie op je computer, bijvoorbeeld `bitvavo-trading-bot`.
2. Zorg ervoor dat je de bestanden en submappen netjes organiseert.

#### **Stap 3: Maak het manifestbestand**
Maak een bestand met de naam **`manifest.json`** en voeg de onderstaande inhoud toe:

```json
{
  "manifest_version": 2,
  "name": "Bitvavo Trading Bot",
  "version": "1.0",
  "permissions": [
    "tabs",
    "https://api.bitvavo.com/*"
  ],
  "background": {
    "scripts": ["background.js"],
    "persistent": false
  },
  "browser_action": {
    "default_popup": "popup.html"
  },
  "icons": {
    "16": "images/icon-16.png",
    "48": "images/icon-48.png",
    "128": "images/icon-128.png"
  }
}
```

**Checklist:**
- Maak het bestand aan.
- Voeg de juiste machtigingen toe voor API-aanroepen.
- Koppel een popup-interface aan.

#### **Stap 4: Maak het popup HTML-bestand**
Maak een bestand genaamd **`popup.html`** en voeg de onderstaande inhoud toe:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bitvavo Trading Bot</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <h1>Bitvavo Trading Bot</h1>
  <div id="balance">
    <p>Your Balance: <span id="balance-amount">Loading...</span></p>
  </div>
  <div id="action">
    <button id="start-trading">Start Trading</button>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

**Checklist:**
- Maak een eenvoudige interface met een knop om te starten.
- Voeg een plaats voor de balansweergave toe.

#### **Stap 5: Maak het CSS-bestand**
Maak een bestand genaamd **`popup.css`** om de popup een nette uitstraling te geven:

```css
body {
  font-family: Arial, sans-serif;
  width: 200px;
  padding: 20px;
}

h1 {
  font-size: 18px;
  text-align: center;
}

#balance {
  margin: 10px 0;
}

#action button {
  width: 100%;
  padding: 10px;
  background-color: #4CAF50;
  color: white;
  border: none;
  cursor: pointer;
}

#action button:hover {
  background-color: #45a049;
}
```

**Checklist:**
- Zorg voor een nette en eenvoudige layout voor de popup.
- Voeg een knop toe voor het starten van de handel.

#### **Stap 6: Maak het JavaScript-bestand voor de popup**
Maak een bestand genaamd **`popup.js`** voor de logica die de API-aanroepen en de handel uitvoert.

```javascript
const API_KEY = 'YOUR_API_KEY';
const API_SECRET = 'YOUR_API_SECRET';

// Functie om je balans op te halen
function getBalance() {
  fetch('https://api.bitvavo.com/v2/account', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    }
  })
  .then(response => response.json())
  .then(data => {
    const balance = data.balance;
    document.getElementById('balance-amount').innerText = balance;
  })
  .catch(error => console.error('Error:', error));
}

// Functie om de handelsbot te starten
function startTrading() {
  console.log('Trading started...');
  // Voeg hier je handelslogica toe, bijvoorbeeld een koop- of verkoopactie
}

// Eventlistener voor de "Start Trading" knop
document.getElementById('start-trading').addEventListener('click', startTrading);

// Laad de balans zodra de popup wordt geopend
getBalance();
```

**Checklist:**
- Vervang `'YOUR_API_KEY'` en `'YOUR_API_SECRET'` door je daadwerkelijke API-sleutels.
- Zorg ervoor dat de functie `getBalance()` correct de accountgegevens ophaalt.
- Voeg de handelslogica toe in de functie `startTrading()`.

#### **Stap 7: Maak het achtergrondscript**
Maak een bestand genaamd **`background.js`** voor eventuele achtergrondtaken en API-aanroepen die niet direct in de popup moeten plaatsvinden:

```javascript
// Achtergrondtaken kunnen hier worden beheerd
console.log('Bitvavo Bot Extension is active');
```

**Checklist:**
- Zorg ervoor dat het achtergrondscript zonder fouten laadt.
- Dit bestand kan later verder worden uitgebreid voor geavanceerde functies.

#### **Stap 8: Voeg een icoon toe voor de extensie**
Maak een map **`images`** en voeg de volgende iconen toe:
- **`icon-16.png`**
- **`icon-48.png`**
- **`icon-128.png`**

Deze iconen worden gebruikt in de browserextensie.

**Checklist:**
- Voeg de icoonbestanden toe aan de `images`-map.
- Zorg ervoor dat de bestandsnamen overeenkomen met de vermelde iconen in het manifest.

#### **Stap 9: Installeer de extensie in de browser**
1. Open je browser (bijvoorbeeld Chrome).
2. Ga naar `chrome://extensions/`.
3. Zet de **Developer Mode** aan (rechtsboven).
4. Klik op **Load unpacked** en selecteer de map `bitvavo-trading-bot` die je hebt gemaakt.
5. De extensie wordt nu geïnstalleerd en je kunt de popup openen door op het extensie-icoon te klikken.

**Checklist:**
- Zorg ervoor dat de extensie correct wordt geladen zonder fouten.
- Test de knop om de balans op te halen en controleer of de handel kan starten.

#### **Stap 10: Test de handelslogica**
1. Controleer of de balans correct wordt opgehaald.
2. Test de handelsfunctionaliteit door bijvoorbeeld een kooporder toe te voegen.
3. Zorg ervoor dat foutmeldingen duidelijk worden weergegeven en dat je de API-aanroepen correct uitvoert.

**Checklist:**
- Test eerst met een **klein bedrag** en **op een testaccount** om geen echte verliezen te maken.
- Voeg logica toe voor het plaatsen van koop- en verkooporders.
- Zorg voor foutafhandeling bij netwerk- of API-problemen.

#### **Stap 11: Veilige opslag van API-sleutels**
1. **Bewaar je API-sleutels veilig**, bijvoorbeeld in een beveiligd opslagbestand, en gebruik nooit hardcoded sleutels in de productieversie van je bot.

**Checklist:**
- Gebruik veilige opslagmethoden voor de API-sleutels (bijvoorbeeld via een beveiligd bestand of variabelen in een omgeving).

#### **Stap 12: Schaal en verfijn de bot**
1. Voeg meer geavanceerde handelsstrategieën toe, zoals:
   - Koop- en verkoopbeslissingen op basis van marktanalyse.
   - Gebruikersinterface om handelsinstellingen in te stellen.
   - Risicobeheer zoals stop-loss en take-profit limieten.
2. **Optimaliseer de prestaties** en zorg ervoor dat de bot goed reageert op marktveranderingen.

**Checklist:**
- Voeg automatische handelsstrategieën toe (bijvoorbeeld eenvoudige prijsvolging).
- Test met verschillende marktomstandigheden en controleer het gedrag van de bot.

### Conclusie
Door deze checklist te volgen en elk van de stappen zorgvuldig uit te voeren, kun je een werkende Bitvavo Trading Bot maken in de vorm van een browserextensie. Begin met eenvoudige functionaliteit (balans ophalen en een simpele handelsknop), en breid vervolgens de logica uit naarmate je meer ervaring opdoet.

Voor een productieklare bot moeten we werken aan zowel **functionaliteit** als **beveiliging**. Hieronder vind je een complete versie van de **Bitvavo Trading Bot**, gestructureerd als een browserextensie. Deze bot biedt eenvoudige balanscontrole en handelsmogelijkheden, maar is voorbereid voor uitbreidingen zoals risicobeheer en geavanceerde strategieën.