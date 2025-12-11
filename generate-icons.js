const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, 'icons', 'icon.svg');
const outputDir = path.join(__dirname, 'icons');

// Kontrollera att SVG-filen finns
if (!fs.existsSync(svgPath)) {
  console.error('Fel: icons/icon.svg hittades inte!');
  process.exit(1);
}

async function generateIcon(size) {
  const outputPath = path.join(outputDir, `icon-${size}.png`);
  
  try {
    // Läs SVG-filen
    const svgContent = fs.readFileSync(svgPath, 'utf8');
    
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
    
    console.log(`✓ Genererade icon-${size}.png (${size}x${size})`);
    return true;
  } catch (error) {
    console.error(`✗ Fel vid generering av icon-${size}.png:`, error.message);
    return false;
  }
}

async function main() {
  console.log('Genererar PNG-ikoner från SVG...\n');
  
  const sizes = [192, 512];
  const results = await Promise.all(sizes.map(size => generateIcon(size)));
  
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

