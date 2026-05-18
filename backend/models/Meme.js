const mongoose = require('mongoose');

const CATEGORIES = ['All', 'Trending', 'Telugu', 'Hindi', 'English', 'Desi', 'Wholesome', 'Dark', 'Reactions', 'Templates', 'Gaming', 'Random'];

const memeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  url:  { type: String, required: true, unique: true },
  tags:     [{ type: String, lowercase: true, trim: true }],
  keywords: [{ type: String, lowercase: true, trim: true }],
  category: { type: String, enum: CATEGORIES, default: 'Random' },
  source:    { type: String, enum: ['reddit', 'imgflip', 'memegen', 'local'], default: 'local' },
  subreddit: { type: String, default: null },
  upvotes:   { type: Number, default: 0 },
  nsfw:      { type: Boolean, default: false },
  permalink: { type: String, default: null },
  width:     { type: Number, default: 0 },
  height:    { type: Number, default: 0 },
  isTemplate: { type: Boolean, default: false },
  usageCount: { type: Number, default: 0, index: true },
  trending:   { type: Boolean, default: false },
  lastFetched: { type: Date, default: Date.now },
}, { timestamps: true });

memeSchema.index({ name: 'text', tags: 'text', keywords: 'text' });
memeSchema.index({ category: 1, upvotes: -1 });
memeSchema.index({ source: 1, subreddit: 1 });

module.exports = mongoose.model('Meme', memeSchema);
