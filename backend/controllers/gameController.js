const Meme = require('../models/Meme');
const User = require('../models/User');
const ReactionScore = require('../models/ReactionScore');
const TyperScore = require('../models/TyperScore');

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

    const allNames = await Meme.find().select('name category').limit(300).lean();

    const questions = await Promise.all(
      memes.map(async (meme) => {
        const categoryPool = allNames
          .filter((m) => m.category === meme.category && m.name !== meme.name)
          .map((m) => m.name);
        const fallbackPool = allNames.filter((m) => m.name !== meme.name).map((m) => m.name);
        const source = categoryPool.length >= 3 ? categoryPool : fallbackPool;
        const wrong = shuffle(source).slice(0, 3);
        const options = shuffle([meme.name, ...wrong]);
        return {
          memeId: meme._id,
          url: meme.url,
          category: meme.category,
          options,
          correctAnswer: meme.name,
        };
      })
    );

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

const saveMaxScore = async (userId, field, score) => {
  const user = await User.findById(userId);
  if (score > (user[field] || 0)) user[field] = score;
  await user.save();
  return user[field];
};

// POST /api/games/snake/score
exports.saveSnakeScore = async (req, res) => {
  try {
    const { score } = req.body;
    if (typeof score !== 'number' || score < 0) return res.status(400).json({ error: 'Invalid score' });
    const highScore = await saveMaxScore(req.userId, 'snakeHighScore', score);
    res.json({ highScore });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save score' });
  }
};

// POST /api/games/2048/score
exports.save2048Score = async (req, res) => {
  try {
    const { score } = req.body;
    if (typeof score !== 'number' || score < 0) return res.status(400).json({ error: 'Invalid score' });
    const highScore = await saveMaxScore(req.userId, 'game2048HighScore', score);
    res.json({ highScore });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save score' });
  }
};

// POST /api/games/simon/score
exports.saveSimonScore = async (req, res) => {
  try {
    const { score } = req.body;
    if (typeof score !== 'number' || score < 0) return res.status(400).json({ error: 'Invalid score' });
    const highScore = await saveMaxScore(req.userId, 'simonHighScore', score);
    res.json({ highScore });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save score' });
  }
};

// POST /api/games/whack/score
exports.saveWhackScore = async (req, res) => {
  try {
    const { score } = req.body;
    if (typeof score !== 'number' || score < 0) return res.status(400).json({ error: 'Invalid score' });
    const highScore = await saveMaxScore(req.userId, 'whackHighScore', score);
    res.json({ highScore });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save score' });
  }
};

// POST /api/games/typer/score
exports.saveTyperScore = async (req, res) => {
  try {
    const { wpm } = req.body;
    if (typeof wpm !== 'number' || wpm < 0 || wpm > 500) {
      return res.status(400).json({ error: 'Invalid WPM' });
    }
    const user = await User.findById(req.userId);
    if (wpm > (user.typerBestWpm || 0)) user.typerBestWpm = wpm;
    await user.save();

    const existing = await TyperScore.findOne({ user: req.userId });
    if (!existing || wpm > existing.wpm) {
      await TyperScore.findOneAndUpdate(
        { user: req.userId },
        {
          user: req.userId,
          displayName: user.displayName || user.username,
          username: user.username,
          avatarColor: user.avatarColor,
          wpm,
        },
        { upsert: true, new: true }
      );
    }

    res.json({ bestWpm: user.typerBestWpm });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save score' });
  }
};

// GET /api/games/typer/leaderboard
exports.getTyperLeaderboard = async (req, res) => {
  try {
    const leaderboard = await TyperScore.find().sort({ wpm: -1 }).limit(10).lean();
    res.json({ leaderboard });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
};

// POST /api/games/wordle/score
exports.saveWordleScore = async (req, res) => {
  try {
    const { score } = req.body;
    if (typeof score !== 'number' || score < 0 || score > 6) {
      return res.status(400).json({ error: 'Invalid score' });
    }
    const highScore = await saveMaxScore(req.userId, 'wordleHighScore', score);
    res.json({ highScore });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save score' });
  }
};

// POST /api/games/flappy/score
exports.saveFlappyScore = async (req, res) => {
  try {
    const { score } = req.body;
    if (typeof score !== 'number' || score < 0) return res.status(400).json({ error: 'Invalid score' });
    const highScore = await saveMaxScore(req.userId, 'flappyHighScore', score);
    res.json({ highScore });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save score' });
  }
};

// POST /api/games/desi-quiz/score
exports.saveDesiQuizScore = async (req, res) => {
  try {
    const { score } = req.body;
    if (typeof score !== 'number' || score < 0 || score > 10) {
      return res.status(400).json({ error: 'Invalid score' });
    }
    const highScore = await saveMaxScore(req.userId, 'desiQuizHighScore', score);
    res.json({ highScore });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save score' });
  }
};

// GET /api/games/stats
exports.getGameStats = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select(
      'quizHighScore reactionBestAvg memeMatchBestTime snakeHighScore game2048HighScore simonHighScore whackHighScore typerBestWpm wordleHighScore flappyHighScore desiQuizHighScore tttWins displayName username'
    );
    res.json({
      stats: {
        quizHighScore: user.quizHighScore,
        reactionBestAvg: user.reactionBestAvg,
        memeMatchBestTime: user.memeMatchBestTime,
        snakeHighScore: user.snakeHighScore,
        game2048HighScore: user.game2048HighScore,
        simonHighScore: user.simonHighScore,
        whackHighScore: user.whackHighScore,
        typerBestWpm: user.typerBestWpm,
        wordleHighScore: user.wordleHighScore,
        flappyHighScore: user.flappyHighScore,
        desiQuizHighScore: user.desiQuizHighScore,
        tttWins: user.tttWins,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch game stats' });
  }
};

// GET /api/games/match/memes — 8 trending memes (16 cards = 8 pairs)
exports.getMatchMemes = async (req, res) => {
  try {
    let memes = await Meme.find({ trending: true })
      .sort({ usageCount: -1 })
      .limit(8)
      .lean();

    if (memes.length < 8) {
      const extra = await Meme.aggregate([
        { $match: { _id: { $nin: memes.map((m) => m._id) } } },
        { $sample: { size: 8 - memes.length } },
      ]);
      memes = [...memes, ...extra];
    }

    if (memes.length < 4) {
      return res.status(400).json({ error: 'Not enough memes' });
    }

    res.json({ memes: memes.slice(0, 8) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load memes' });
  }
};
