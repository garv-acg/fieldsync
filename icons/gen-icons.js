// Run once: node icons/gen-icons.js
// Requires: npm install canvas (or skip and use SVG-only)
const fs = require('fs');
const path = require('path');

function makeSVG(size) {
  const r = Math.round(size * 0.195); // corner radius ~100/512
  const stroke = Math.max(2, Math.round(size * 0.02));
  const dotR = Math.round(size * 0.023);
  const cx = size / 2, cy = size * 0.43;
  const half = size * 0.18;
  const textY = size * 0.9;
  const fontSize = Math.round(size * 0.1);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="#1A1F2E"/>
  <polygon points="${cx},${cy-half} ${cx+half},${cy} ${cx},${cy+half} ${cx-half},${cy}" fill="none" stroke="#4A70FF" stroke-width="${stroke}" stroke-linejoin="round"/>
  <circle cx="${cx}" cy="${cy-half}" r="${dotR}" fill="#4A70FF"/>
  <circle cx="${cx+half}" cy="${cy}" r="${dotR}" fill="#4A70FF"/>
  <circle cx="${cx}" cy="${cy+half}" r="${dotR}" fill="#4A70FF"/>
  <circle cx="${cx-half}" cy="${cy}" r="${dotR}" fill="#4A70FF"/>
  <text x="${cx}" y="${textY}" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="${fontSize}" font-weight="800" fill="#E8ECF8">FieldSync</text>
</svg>`;
}

// Write SVG versions at each size (browsers that accept SVG PNGs workaround)
[192, 512].forEach(size => {
  fs.writeFileSync(path.join(__dirname, `icon-${size}.svg`), makeSVG(size));
  console.log(`Written icon-${size}.svg`);
});
console.log('Done. For true PNG icons, open icons/icon-192.svg and icon-512.svg in a browser and screenshot, or use an online SVG→PNG converter.');
