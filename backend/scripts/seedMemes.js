require('dotenv').config();
const connectDB = require('../config/db');
const { fetchAndSeedAll } = require('../services/memeService');

async function main() {
  console.log('🎭 MAX Meme Seeder — Connecting to DB...');
  await connectDB();
  console.log('✅ DB connected\n');
  const result = await fetchAndSeedAll(console.log);
  console.log(`\n🏁 Seeding complete! ${result.total} unique memes processed.`);
  process.exit(0);
}

main().catch(err => { console.error('❌ Seeder error:', err); process.exit(1); });
