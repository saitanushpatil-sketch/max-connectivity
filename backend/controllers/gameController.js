const User = require('../models/User');
const GameScore = require('../models/GameScore');

const LOWER_IS_BETTER_GAMES = ['reaction-test'];

// Map gameId to User model field name for backward compatibility
const GAME_FIELD_MAP = {
  '2048': 'game2048HighScore',
  'reaction-test': 'reactionBestAvg',
  'snake': 'snakeHighScore',
  'simon-says': 'simonHighScore',
  'whack-a-mole': 'whackHighScore',
  'type-racer': 'typerBestWpm',
  'wordle': 'wordleHighScore',
  'flappy-bird': 'flappyHighScore',
  'tic-tac-toe': 'tttWins',
  'desi-quiz': 'desiQuizHighScore',
  'car-racer': 'carRacerHighScore',
  'space-shooter': 'spaceShooterHighScore',
};

exports.saveScore = async (req, res) => {
  try {
    const { gameId, score } = req.body;
    if (!gameId || score === undefined) return res.status(400).json({ error: 'Missing gameId or score' });

    const lowerIsBetter = LOWER_IS_BETTER_GAMES.includes(gameId);

    // Get current top score
    const currentRecord = await GameScore.findOne({ user: req.userId, gameId });
    const currentScore = currentRecord ? currentRecord.score : (lowerIsBetter ? Infinity : -Infinity);

    const isNewHighScore = lowerIsBetter ? score < currentScore : score > currentScore;

    if (isNewHighScore) {
      await GameScore.findOneAndUpdate(
        { user: req.userId, gameId },
        { score, achievedAt: Date.now() },
        { upsert: true, new: true }
      );

      // Save to user document using the correct field name
      const fieldName = GAME_FIELD_MAP[gameId];
      if (fieldName) {
        try {
          await User.findByIdAndUpdate(
            req.userId,
            { $set: { [fieldName]: score } }
          );
        } catch (err) {
          console.error('Failed to update User document with new score:', err);
        }
      }

      return res.json({ newHighScore: true, score });
    }

    res.json({ newHighScore: false, bestScore: currentScore });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save score' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const scores = await GameScore.find({ user: req.userId });
    const stats = {};
    scores.forEach(s => {
      stats[s.gameId] = s.score;
    });
    res.json({ stats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch game stats' });
  }
};

exports.getLeaderboard = async (req, res) => {
  try {
    const { gameId } = req.query;
    if (!gameId) return res.status(400).json({ error: 'gameId required' });

    const lowerIsBetter = LOWER_IS_BETTER_GAMES.includes(gameId);
    const sortDir = lowerIsBetter ? 1 : -1;

    const topScores = await GameScore.find({ gameId })
      .sort({ score: sortDir })
      .limit(10)
      .populate('user', 'displayName username avatarColor')
      .lean();

    const leaderboard = topScores.map((s, i) => ({
      rank: i + 1,
      displayName: s.user?.displayName || s.user?.username || 'Unknown',
      username: s.user?.username || 'unknown',
      avatarColor: s.user?.avatarColor || '#00F5FF',
      score: s.score,
      achievedAt: s.achievedAt,
    }));

    let myRank = null;
    let myScore = null;

    if (req.userId) {
      const myRecord = await GameScore.findOne({ user: req.userId, gameId });
      if (myRecord) {
        myScore = myRecord.score;
        const betterCount = await GameScore.countDocuments({
          gameId,
          score: lowerIsBetter ? { $lt: myScore } : { $gt: myScore }
        });
        myRank = betterCount + 1;
      }
    }

    res.json({ leaderboard, myRank, myScore });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
};
