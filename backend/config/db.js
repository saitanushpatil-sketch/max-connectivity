const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
  } catch (error) {
    throw error;
  }
};

mongoose.connection.on('disconnected', () => {
  isConnected = false;
});

module.exports = connectDB;
