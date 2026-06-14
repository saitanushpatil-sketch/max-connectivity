const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  isGroup: { type: Boolean, default: false },
  groupName: String,
  groupAvatar: String,
  groupAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  lastMessageAt: { type: Date, default: Date.now },
  theme: { type: String, default: 'jarvis', enum: ['jarvis', 'sunset', 'forest', 'ocean', 'void'] },
  disappearAfter: { type: Number, default: null }, // hours
  unreadCounts: { type: Map, of: Number, default: {} },
  mutedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
