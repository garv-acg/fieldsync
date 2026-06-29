const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const r = size * 0.195;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fillStyle = '#141828';
  ctx.fill();

  const fontSize = Math.round(size * 0.414); // 212/512
  ctx.font = `900 ${fontSize}px "Arial Black", Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const baselineY = size * 0.645; // 330/512

  ctx.fillStyle = '#ffffff';
  ctx.fillText('F', size * 0.344, baselineY); // 176/512

  ctx.fillStyle = '#4A70FF';
  ctx.fillText('S', size * 0.684, baselineY); // 350/512

  return canvas.toBuffer('image/png');
}

[192, 512].forEach(size => {
  const buf = drawIcon(size);
  fs.writeFileSync(path.join(__dirname, `icon-${size}.png`), buf);
  console.log(`icon-${size}.png written`);
});
