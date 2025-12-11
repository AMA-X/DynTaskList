# Dynamic Task Board

En PWA (Progressive Web App) för att hantera backlog och veckoplanering med drag-and-drop.

## Lokal utveckling

### Starta lokal server

För att öppna appen på telefonen behöver den serveras via en webbserver (PWAs fungerar inte om du bara öppnar filen direkt).

1. **Starta servern:**
   ```bash
   npm start
   ```
   Eller:
   ```bash
   npm run serve
   ```

2. **Öppna på telefonen:**
   - Se till att telefonen är på samma WiFi-nätverk som din dator
   - Öppna webbläsaren på telefonen
   - Gå till: `http://192.168.68.102:8080`
   - (Om IP-adressen är annorlunda, kontrollera med `ipconfig` på Windows)

3. **Installera på hemskärmen:**
   - **VIKTIGT:** PWAs kräver HTTPS för installation! HTTP fungerar inte.
   - **Lösning:** Använd GitHub Pages (se nedan) eller sätt upp lokal HTTPS
   - **iOS Safari:** Klicka på delningsknappen (fyrkant med pil) → "Lägg till på hemskärmen"
   - **Android Chrome/Brave:** Efter att ha öppnat via HTTPS, leta efter "Installera app" i menyn eller en banner längst ner

## Alternativ: GitHub Pages

Om du vill att appen ska vara tillgänglig online:

1. Gå till ditt GitHub-repo: https://github.com/AMA-X/DynTaskList
2. Settings → Pages
3. Välj branch `main` och folder `/ (root)`
4. Spara
5. Appen kommer vara tillgänglig på: `https://ama-x.github.io/DynTaskList`

## Generera ikoner

Om du behöver generera PNG-ikoner igen:
```bash
npm run generate-icons
```

