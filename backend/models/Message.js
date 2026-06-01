const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
  emoji: { type: String, required: true },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { _id: false });

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
    index: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['text', 'meme', 'gif', 'voice'],
    default: 'text',
  },
  content: {
    type: String,
    required: true,
    maxlength: 500000,
  },
  memeData: {
    id: String,
    memeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meme' },
    name: String,
    title: String,
    url: String,
    preview: String,
    mp4: String,
  },
  // Reply to another message
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null,
  },
  reactions: [reactionSchema],
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deletedForEveryone: {
    type: Boolean,
    default: false,
  },
  // Disappearing messages support
  expiresAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Compound index for conversation pagination
messageSchema.index({ conversationId: 1, createdAt: -1 });
// TTL index for disappearing messages
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Message', messageSchema);
