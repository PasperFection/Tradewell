Het bouwen van een simpele, aantrekkelijke bot voor het handelen op Bitvavo via een browserextensie vereist een aantal stappen. Aangezien de Bitvavo API en de documentatie die je hebt gedeeld ons toegang geven tot de nodige gegevens om te handelen, kunnen we de volgende aanpak gebruiken:

### Stappen voor het bouwen van de browser-extensie:

#### 1. **Stel de API-koppeling in**
   - Registreer je op de [Bitvavo API](https://docs.bitvavo.com/).
   - Maak een API-sleutel en geheim aan in je Bitvavo-account, die je zal gebruiken om verbinding te maken met de API.
   - Zorg ervoor dat je de nodige machtigingen hebt ingesteld (bijvoorbeeld om te handelen en je balans te bekijken).

#### 2. **Structuur van de Browserextensie**
   Een browserextensie bestaat uit verschillende onderdelen: een **manifestbestand**, **HTML-bestanden** (voor de interface), **JavaScript-bestanden** (voor de logica), en **CSS-bestanden** (voor de opmaak). De extensie zal communiceren met de Bitvavo API en eenvoudige handelslogica toepassen.

##### **Bestand 1: Manifest (manifest.json)**
   Dit bestand bevat metadata over de extensie, zoals naam, versie en machtigingen.
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

##### **Bestand 2: HTML-bestand (popup.html)**
   Dit bestand biedt de interface voor de gebruiker om interactie te hebben met de bot.
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

##### **Bestand 3: CSS-bestand (popup.css)**
   Hiermee kun je de interface een mooie uitstraling geven.
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

##### **Bestand 4: JavaScript-bestand voor de logica (popup.js)**
   Dit bestand bevat de logica om te handelen via de Bitvavo API. Hierin maak je verbinding met de API en verzend je handelsopdrachten.
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
     // Hier kun je je handelslogica implementeren (bijvoorbeeld een koop- of verkoopactie)
     console.log('Trading started...');
   }

   // Eventlistener voor de "Start Trading" knop
   document.getElementById('start-trading').addEventListener('click', startTrading);

   // Laad de balans zodra de popup wordt geopend
   getBalance();
   ```

##### **Bestand 5: Achtergrondproces voor de API-aanroepen (background.js)**
   Dit bestand houdt de achtergrondprocessen van de extensie draaiende en kan bijvoorbeeld in de toekomst gebruikt worden voor het uitvoeren van geplande handelspunten.
   ```javascript
   // Achtergrondtaken kunnen hier worden beheerd
   console.log('Bitvavo Bot Extension is active');
   ```

#### 3. **Interactie met de Bitvavo API**
   Het belangrijkste stuk van de bot is de interactie met de [Bitvavo API](https://docs.bitvavo.com/). Voor basisinteracties kun je de volgende stappen gebruiken:

   - **Marktgegevens opvragen** (bijvoorbeeld de prijzen van cryptocurrencies):
     ```javascript
     fetch('https://api.bitvavo.com/v2/ticker/24h?market=BTC-EUR')
       .then(response => response.json())
       .then(data => {
         console.log('Price:', data.price);
       });
     ```

   - **Bestellingen plaatsen**:
     Voor het plaatsen van koop- of verkooporders kun je de `/v2/orders` endpoint gebruiken. Dit vereist een POST-aanroep met de juiste gegevens.
     ```javascript
     fetch('https://api.bitvavo.com/v2/orders', {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${API_KEY}`,
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({
         market: 'BTC-EUR',
         side: 'buy', // 'sell' voor verkoop
         amount: 0.01, // Aantal BTC
         price: 30000 // Koopprijs
       })
     })
     .then(response => response.json())
     .then(data => console.log(data))
     .catch(error => console.error('Error:', error));
     ```

#### 4. **Testen en Fijnslijpen**
   Test de extensie in je browser om te controleren of alles goed werkt:
   - Haal de balans op.
   - Plaats een eenvoudige koop- of verkooporder.
   - Verfijn de gebruikersinterface en verbeter de gebruikservaring.

#### 5. **Veiligheid**
   - Zorg ervoor dat je je **API-sleutels** veilig houdt, bijvoorbeeld door ze in een beveiligd bestand of via een veilige opslagmechanisme te bewaren.
   - Beperk de machtigingen van de API-sleutels tot alleen de noodzakelijke acties (zoals het bekijken van je balans en het plaatsen van orders).

### Conclusie
Deze eenvoudige bot kan starten met het ophalen van gegevens van je Bitvavo-account en het plaatsen van basisorders. Naarmate je meer geavanceerde functies wilt implementeren, kun je de logica uitbreiden (zoals trading-strategieën, risicobeheer, en automatische aankopen of verkopen).

---

### **Structuur van de bot**
```
bitvavo-trading-bot/
│
├── manifest.json
├── popup.html
├── popup.js
├── popup.css
├── background.js
└── images/
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

---

### 1. **Manifestbestand (`manifest.json`)**

```json
{
  "manifest_version": 3,
  "name": "Bitvavo Trading Bot",
  "version": "1.0",
  "permissions": [
    "storage",
    "alarms",
    "activeTab",
    "scripting",
    "https://api.bitvavo.com/*"
  ],
  "host_permissions": [
    "https://api.bitvavo.com/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "images/icon-16.png",
      "48": "images/icon-48.png",
      "128": "images/icon-128.png"
    }
  },
  "icons": {
    "16": "images/icon-16.png",
    "48": "images/icon-48.png",
    "128": "images/icon-128.png"
  }
}
```

---

### 2. **HTML-interface (`popup.html`)**

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
  <div id="actions">
    <button id="start-trading">Start Trading</button>
    <button id="stop-trading">Stop Trading</button>
  </div>
  <div id="messages">
    <p id="status-message"></p>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

---

### 3. **CSS voor de interface (`popup.css`)**

```css
body {
  font-family: Arial, sans-serif;
  padding: 10px;
  width: 300px;
}

h1 {
  text-align: center;
  font-size: 18px;
  color: #333;
}

#balance {
  margin: 15px 0;
}

#actions button {
  margin: 5px 0;
  padding: 10px;
  width: 100%;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

#actions button:hover {
  background-color: #45a049;
}

#messages {
  margin-top: 10px;
  color: red;
  font-weight: bold;
}
```

---

### 4. **Popup JavaScript (`popup.js`)**

```javascript
const API_BASE_URL = "https://api.bitvavo.com/v2";
const API_KEY = "YOUR_API_KEY";
const API_SECRET = "YOUR_API_SECRET";

async function fetchBalance() {
  const url = `${API_BASE_URL}/account`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch balance");
    }

    const data = await response.json();
    document.getElementById("balance-amount").innerText =
      data.balance ? `${data.balance} EUR` : "No Data";
  } catch (error) {
    document.getElementById("status-message").innerText = error.message;
    console.error(error);
  }
}

async function startTrading() {
  // Voorbeeldstrategie: plaats een limietorder
  const url = `${API_BASE_URL}/order`;
  const orderPayload = {
    market: "BTC-EUR",
    side: "buy",
    orderType: "limit",
    amount: "0.001", // Aantal BTC
    price: "25000", // Prijs per BTC
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!response.ok) {
      throw new Error("Failed to place order");
    }

    const result = await response.json();
    document.getElementById("status-message").innerText =
      `Order placed successfully: ${result.orderId}`;
  } catch (error) {
    document.getElementById("status-message").innerText = error.message;
    console.error(error);
  }
}

document.getElementById("start-trading").addEventListener("click", startTrading);
document.getElementById("stop-trading").addEventListener("click", () => {
  document.getElementById("status-message").innerText = "Trading stopped";
});

fetchBalance();
```

---

### 5. **Achtergrondscript (`background.js`)**

```javascript
chrome.runtime.onInstalled.addListener(() => {
  console.log("Bitvavo Trading Bot is installed.");
});

// Dit bestand kan worden uitgebreid voor achtergrondtaken
```

---

### 6. **Icoonbestanden**

Plaats eenvoudige icoonbestanden in de map `images/`:
- 16x16, 48x48, en 128x128 pixels.

---

### 7. **Installatie van de extensie**
1. Open Google Chrome of Edge.
2. Navigeer naar `chrome://extensions/`.
3. Zet **Developer Mode** aan.
4. Klik op **Load unpacked** en selecteer de `bitvavo-trading-bot`-map.

---

### **Iteraties en verbeteringen**
Deze bot biedt de basisfunctionaliteit voor balanscontrole en orderbeheer. Voeg iteratief de volgende uitbreidingen toe:
1. **Risicobeheersing**: Maximaal te investeren bedrag.
2. **Stop-loss en take-profit**: Orders aanpassen.
3. **Realtime updates**: Gebruik websockets om direct te reageren op marktveranderingen.

Laat me weten hoe ik je verder kan ondersteunen bij specifieke functionaliteiten! 🚀