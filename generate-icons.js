const sharp = require('sharp');
const fs = require('fs');

// Create a simple bicycle icon using SVG
const iconSvg = `
<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="#3B82F6"/>
  <text x="512" y="650" font-size="600" text-anchor="middle" fill="white">🚲</text>
</svg>
`;

const adaptiveIconSvg = `
<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="transparent"/>
  <text x="512" y="650" font-size="600" text-anchor="middle" fill="#3B82F6">🚲</text>
</svg>
`;

const splashSvg = `
<svg width="2048" height="2048" xmlns="http://www.w3.org/2000/svg">
  <rect width="2048" height="2048" fill="#ffffff"/>
  <text x="1024" y="1200" font-size="800" text-anchor="middle" fill="#3B82F6">🚲</text>
  <text x="1024" y="1500" font-size="120" text-anchor="middle" fill="#1F2937">Karunya Cycle Rental</text>
</svg>
`;

const faviconSvg = `
<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" fill="#3B82F6"/>
  <text x="24" y="36" font-size="32" text-anchor="middle" fill="white">🚲</text>
</svg>
`;

async function generateIcons() {
  const assetsDir = './assets';
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir);
  }

  console.log('Generating icon.png...');
  await sharp(Buffer.from(iconSvg))
    .resize(1024, 1024)
    .png()
    .toFile('./assets/icon.png');

  console.log('Generating adaptive-icon.png...');
  await sharp(Buffer.from(adaptiveIconSvg))
    .resize(1024, 1024)
    .png()
    .toFile('./assets/adaptive-icon.png');

  console.log('Generating splash.png...');
  await sharp(Buffer.from(splashSvg))
    .resize(2048, 2048)
    .png()
    .toFile('./assets/splash.png');

  console.log('Generating favicon.png...');
  await sharp(Buffer.from(faviconSvg))
    .resize(48, 48)
    .png()
    .toFile('./assets/favicon.png');

  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
