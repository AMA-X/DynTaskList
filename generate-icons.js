const sharp = require('sharp');
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
    await sharp(svgPath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 15, g: 18, b: 32, alpha: 1 } // #0f1220
      })
      .png()
      .toFile(outputPath);
    
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

