const mongoose = require('mongoose');

const typerScoreSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    displayName: { type: String, required: true },
    username: { type: String, required: true },
    avatarColor: { type: String, default: '#00F5FF' },
    wpm: { type: Number, required: true },
  },
  { timestamps: true }
);

typerScoreSchema.index({ wpm: -1 });

module.exports = mongoose.model('TyperScore', typerScoreSchema);
