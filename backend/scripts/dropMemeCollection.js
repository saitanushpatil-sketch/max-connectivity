require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

async function dropMemes() {
  await connectDB();
  try {
    await mongoose.connection.db.dropCollection('memes');
    console.log('✅ Dropped memes collection');
  } catch (err) {
    if (err.codeName === 'NamespaceNotFound') {
      console.log('ℹ️  memes collection does not exist');
    } else {
      console.error('Error:', err.message);
    }
  }
  await mongoose.disconnect();
  process.exit(0);
}

dropMemes();
