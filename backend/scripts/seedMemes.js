require('dotenv').config();
const mongoose = require('mongoose');
const Meme = require('../models/Meme');
const memesData = require('../data/memes.json');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    await Meme.deleteMany({});
    console.log('🗑️  Cleared existing memes');

    const inserted = await Meme.insertMany(memesData);
    console.log(`✅ Seeded ${inserted.length} memes`);

    const categories = [...new Set(inserted.map(m => m.category))];
    console.log(`📦 Categories: ${categories.join(', ')}`);

    await mongoose.disconnect();
    console.log('✅ Done! Disconnected.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
}

seed();
