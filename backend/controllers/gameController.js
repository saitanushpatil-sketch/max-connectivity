const Meme = require('../models/Meme');
const User = require('../models/User');
const ReactionScore = require('../models/ReactionScore');

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// GET /api/games/quiz/questions
exports.getQuizQuestions = async (req, res) => {
  try {
    const memes = await Meme.aggregate([{ $sample: { size: 10 } }]);
    if (memes.length < 4) {
      return res.status(400).json({ error: 'Not enough memes in database' });
    }

    const allNames = await Meme.find().select('name').limit(200).lean();
    const namePool = allNames.map((m) => m.name);

    const questions = memes.map((meme) => {
      const wrong = shuffle(namePool.filter((n) => n !== meme.name)).slice(0, 3);
      const options = shuffle([meme.name, ...wrong]);
      return {
        memeId: meme._id,
        url: meme.url,
        options,
        correctAnswer: meme.name,
      };
    });

    res.json({ questions });
  } catch (err) {
    console.error('Quiz questions error:', err);
    res.status(500).json({ error: 'Failed to load quiz' });
  }
};

// POST /api/games/quiz/score
exports.saveQuizScore = async (req, res) => {
  try {
    const { score } = req.body;
    if (typeof score !== 'number' || score < 0 || score > 10) {
      return res.status(400).json({ error: 'Invalid score' });
    }
    const user = await User.findById(req.userId);
    if (score > user.quizHighScore) user.quizHighScore = score;
    await user.save();
    res.json({ highScore: user.quizHighScore });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save score' });
  }
};

// POST /api/games/reaction
exports.saveReactionScore = async (req, res) => {
  try {
    const { times } = req.body;
    if (!Array.isArray(times) || times.length !== 5) {
      return res.status(400).json({ error: 'Need exactly 5 reaction times (ms)' });
    }
    const valid = times.every((t) => typeof t === 'number' && t >= 50 && t < 10000);
    if (!valid) return res.status(400).json({ error: 'Invalid reaction times' });

    const avgMs = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    const bestMs = Math.min(...times);

    const user = await User.findById(req.userId);
    if (!user.reactionBestAvg || avgMs < user.reactionBestAvg) {
      user.reactionBestAvg = avgMs;
    }
    await user.save();

    await ReactionScore.findOneAndUpdate(
      { user: req.userId },
      {
        user: req.userId,
        displayName: user.displayName || user.username,
        username: user.username,
        avatarColor: user.avatarColor,
        avgMs,
        bestMs,
      },
      { upsert: true, new: true }
    );

    res.json({ avgMs, bestMs, personalBest: user.reactionBestAvg });
  } catch (err) {
    console.error('Reaction score error:', err);
    res.status(500).json({ error: 'Failed to save reaction score' });
  }
};

// GET /api/games/reaction/leaderboard
exports.getReactionLeaderboard = async (req, res) => {
  try {
    const leaderboard = await ReactionScore.find()
      .sort({ avgMs: 1 })
      .limit(10)
      .lean();
    res.json({ leaderboard });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
};

// POST /api/games/match
exports.saveMatchTime = async (req, res) => {
  try {
    const { seconds } = req.body;
    if (typeof seconds !== 'number' || seconds < 5 || seconds > 600) {
      return res.status(400).json({ error: 'Invalid time' });
    }
    const user = await User.findById(req.userId);
    if (!user.memeMatchBestTime || seconds < user.memeMatchBestTime) {
      user.memeMatchBestTime = seconds;
    }
    await user.save();
    res.json({ bestTime: user.memeMatchBestTime });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save match time' });
  }
};

// GET /api/games/stats
exports.getGameStats = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select(
      'quizHighScore reactionBestAvg memeMatchBestTime displayName username'
    );
    res.json({
      stats: {
        quizHighScore: user.quizHighScore,
        reactionBestAvg: user.reactionBestAvg,
        memeMatchBestTime: user.memeMatchBestTime,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch game stats' });
  }
};

// GET /api/games/match/memes — 8 random memes for memory game (4 pairs)
exports.getMatchMemes = async (req, res) => {
  try {
    const memes = await Meme.aggregate([{ $sample: { size: 4 } }]);
    if (memes.length < 4) {
      return res.status(400).json({ error: 'Not enough memes' });
    }
    res.json({ memes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load memes' });
  }
};
