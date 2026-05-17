const mongoose = require('mongoose');

const memeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  url: {
    type: String,
    required: true,
  },
  tags: [{ type: String, lowercase: true, trim: true }],
  keywords: [{ type: String, lowercase: true, trim: true }],
  category: {
    type: String,
    enum: ['Reaction', 'Greeting', 'Emotion', 'Humor', 'Relatable', 'Savage', 'Wholesome', 'Gaming', 'Work', 'College', 'General'],
    default: 'General',
  },
  usageCount: {
    type: Number,
    default: 0,
    index: true,
  },
  trending: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Text search index
memeSchema.index({ name: 'text', tags: 'text', keywords: 'text' });

module.exports = mongoose.model('Meme', memeSchema);
