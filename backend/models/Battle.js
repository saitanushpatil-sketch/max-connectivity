const mongoose = require('mongoose');

const memePickSchema = new mongoose.Schema(
  {
    memeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meme' },
    url: { type: String, required: true },
    name: { type: String, required: true },
  },
  { _id: false }
);

const battleSchema = new mongoose.Schema(
  {
    challenger: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    opponent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'active', 'completed', 'expired', 'declined'],
      default: 'pending',
    },
    challengerMeme: memePickSchema,
    opponentMeme: memePickSchema,
    votes: {
      challenger: { type: Number, default: 0 },
      opponent: { type: Number, default: 0 },
    },
    voters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

battleSchema.index({ status: 1, expiresAt: 1 });
battleSchema.index({ challenger: 1, opponent: 1 });

module.exports = mongoose.model('Battle', battleSchema);
