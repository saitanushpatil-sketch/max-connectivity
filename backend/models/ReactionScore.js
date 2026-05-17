const mongoose = require('mongoose');

const reactionScoreSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    displayName: { type: String, required: true },
    username: { type: String, required: true },
    avatarColor: { type: String, default: '#00F5FF' },
    avgMs: { type: Number, required: true },
    bestMs: { type: Number, required: true },
  },
  { timestamps: true }
);

reactionScoreSchema.index({ avgMs: 1 });

module.exports = mongoose.model('ReactionScore', reactionScoreSchema);
