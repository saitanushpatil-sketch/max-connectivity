const mongoose = require('mongoose');

const gameScoreSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  gameId: {
    type: String,
    required: true,
    enum: [
      'reaction-test', 'snake', '2048', 'simon-says', 
      'whack-a-mole', 'type-racer', 'wordle', 'flappy-bird', 
      'tic-tac-toe', 'cryptogram'
    ]
  },
  score: {
    type: Number,
    required: true,
  },
  achievedAt: {
    type: Date,
    default: Date.now,
  },
});

gameScoreSchema.index({ gameId: 1, score: -1 });
gameScoreSchema.index({ gameId: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('GameScore', gameScoreSchema);
