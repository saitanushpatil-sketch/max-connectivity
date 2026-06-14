const mongoose = require('mongoose');

const blacklistSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true, index: true },
  createdAt: { type: Date, default: Date.now, expires: 30 * 24 * 60 * 60 }, // TTL = 30 days
});

const Blacklist = mongoose.model('TokenBlacklist', blacklistSchema);

exports.blacklistToken = async (token) => {
  try { await Blacklist.create({ token }); } catch {}
};

exports.isBlacklisted = async (token) => {
  const found = await Blacklist.findOne({ token });
  return !!found;
};
