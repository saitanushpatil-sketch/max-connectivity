const fs = require('fs');
const path = require('path');

const MEMES = {
  Telugu: [
    'mahesh-babu-pointing', 'allu-arjun-pushpa', 'pawan-kalyan-serious',
    'ntr-angry', 'brahmanandam-reaction', 'venkatesh-surprised'
  ],
  Hindi: [
    'srk-arms-open', 'ranveer-screaming', 'akshay-salute', 'amitabh-pointing'
  ],
  Internet: [
    'drake-approve', 'distracted-boyfriend', 'this-is-fine', 'surprised-pikachu',
    'two-buttons', 'gru-plan', 'stonks', 'brain-expanding', 'panik-kalm', 'gigachad'
  ]
};

const COLORS = ['#FF006E', '#00F5FF', '#06D6A0', '#FFB703', '#8B5CF6'];

function generateSvg(name, color) {
  return `<svg width="800" height="800" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${color}" />
    <text x="50%" y="50%" font-family="sans-serif" font-size="48" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">
      ${name.replace(/-/g, ' ').toUpperCase()}
    </text>
  </svg>`;
}

const targetDir = path.join(__dirname, '../public/memes');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

let colorIndex = 0;

Object.entries(MEMES).forEach(([category, list]) => {
  list.forEach(name => {
    const color = COLORS[colorIndex % COLORS.length];
    const svg = generateSvg(name, color);
    const filePath = path.join(targetDir, `${name}.svg`);
    fs.writeFileSync(filePath, svg);
    colorIndex++;
  });
});

console.log('Meme templates seeded successfully to /public/memes');
