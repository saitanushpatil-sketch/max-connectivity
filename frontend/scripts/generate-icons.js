#!/usr/bin/env node
// Run: node scripts/generate-icons.js
// Requires: npm install sharp --save-dev

const sharp = require('sharp');
const path = require('path');

const svg192 = `<svg width='192' height='192' xmlns='http://www.w3.org/2000/svg'><rect width='192' height='192' rx='32' fill='#0A0A0F'/><rect x='4' y='4' width='184' height='184' rx='28' fill='none' stroke='#00F5FF' stroke-width='2'/><text x='96' y='110' font-family='Arial' font-weight='bold' font-size='56' fill='#00F5FF' text-anchor='middle'>MAX</text></svg>`;
const svg512 = `<svg width='512' height='512' xmlns='http://www.w3.org/2000/svg'><rect width='512' height='512' rx='80' fill='#0A0A0F'/><rect x='8' y='8' width='496' height='496' rx='72' fill='none' stroke='#00F5FF' stroke-width='4'/><text x='256' y='300' font-family='Arial' font-weight='bold' font-size='160' fill='#00F5FF' text-anchor='middle'>MAX</text></svg>`;

const publicDir = path.join(__dirname, '..', 'public');

Promise.all([
  sharp(Buffer.from(svg192)).png().toFile(path.join(publicDir, 'icon-192.png')),
  sharp(Buffer.from(svg512)).png().toFile(path.join(publicDir, 'icon-512.png')),
]).then(() => {
  console.log('✅ Icons generated: icon-192.png, icon-512.png');
}).catch((err) => {
  console.error('Failed to generate icons:', err);
});
