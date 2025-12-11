# Sätt upp HTTPS för lokal utveckling

PWAs kräver HTTPS för att kunna installeras (utom localhost). Här är två enkla alternativ:

## Alternativ 1: Använd GitHub Pages (Rekommenderat - Enklast!)

1. Gå till: https://github.com/AMA-X/DynTaskList/settings/pages
2. Under "Source" välj:
   - Branch: `main`
   - Folder: `/ (root)`
3. Klicka "Save"
4. Vänta 1-2 minuter
5. Öppna på telefonen: `https://ama-x.github.io/DynTaskList` eller `https://ama-x.github.com/DynTaskList`
   - Om du har en anpassad domän konfigurerad, använd den istället
6. Nu ska "Installera app" visas!

## Alternativ 2: Lokal HTTPS med mkcert (Avancerat)

Om du vill köra lokalt med HTTPS:

1. Installera mkcert: https://github.com/FiloSottile/mkcert
2. Kör:
   ```bash
   mkcert -install
   mkcert localhost 192.168.68.102
   ```
3. Detta skapar `localhost+1.pem` och `localhost+1-key.pem`
4. Döp om dem till `cert.pem` och `key.pem`
5. Starta servern: `npm run serve-https`
6. Öppna: `https://192.168.68.102:8080` på telefonen

## Alternativ 3: Använd ngrok (Enkelt men kräver konto)

1. Installera ngrok: https://ngrok.com/
2. Starta din vanliga server: `npm start`
3. I ett nytt terminalfönster: `ngrok http 8080`
4. Använd HTTPS-URL:en som ngrok ger dig på telefonen

