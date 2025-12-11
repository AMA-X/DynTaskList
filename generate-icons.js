const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, 'icons', 'icon.svg');
const svgMaskablePath = path.join(__dirname, 'icons', 'icon-maskable.svg');
const outputDir = path.join(__dirname, 'icons');

// Kontrollera att SVG-filen finns
if (!fs.existsSync(svgPath)) {
  console.error('Fel: icons/icon.svg hittades inte!');
  process.exit(1);
}

async function generateIcon(size, isMaskable = false) {
  const suffix = isMaskable ? '-maskable' : '';
  const outputPath = path.join(outputDir, `icon-${size}${suffix}.png`);
  const svgFile = isMaskable ? svgMaskablePath : svgPath;
  
  try {
    // Läs SVG-filen
    const svgContent = fs.readFileSync(svgFile, 'utf8');
    
    // Skapa HTML som renderar SVG:en med emoji-stöd
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap');
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              width: ${size}px;
              height: ${size}px;
              background: #0f1220;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif;
            }
            svg {
              width: ${size}px;
              height: ${size}px;
              display: block;
            }
            svg text {
              font-family: 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', system-ui, sans-serif;
            }
          </style>
        </head>
        <body>
          ${svgContent}
        </body>
      </html>
    `;
    
    // Starta Puppeteer
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'load' });
    
    // Vänta lite extra för att emojis ska renderas
    await page.waitForTimeout(1000);
    
    // Ta screenshot med hög kvalitet
    await page.screenshot({
      path: outputPath,
      width: size,
      height: size,
      type: 'png',
      fullPage: false
    });
    
    await browser.close();
    
    const iconName = isMaskable ? `icon-${size}-maskable.png` : `icon-${size}.png`;
    console.log(`✓ Genererade ${iconName} (${size}x${size})`);
    return true;
  } catch (error) {
    console.error(`✗ Fel vid generering av icon-${size}.png:`, error.message);
    return false;
  }
}

async function main() {
  console.log('Genererar PNG-ikoner från SVG...\n');
  
  const sizes = [192, 512];
  const tasks = [];
  
  // Generera vanliga ikoner
  for (const size of sizes) {
    tasks.push(generateIcon(size, false));
  }
  
  // Generera maskable ikoner
  for (const size of sizes) {
    tasks.push(generateIcon(size, true));
  }
  
  const results = await Promise.all(tasks);
  const allSuccess = results.every(r => r === true);
  
  if (allSuccess) {
    console.log('\n✓ Alla ikoner genererade framgångsrikt!');
    process.exit(0);
  } else {
    console.log('\n✗ Några ikoner kunde inte genereras.');
    process.exit(1);
  }
}

main();

