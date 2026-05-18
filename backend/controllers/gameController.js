const User = require('../models/User');
const ReactionScore = require('../models/ReactionScore');

const GAME_FIELD_MAP = {
  '2048': 'score2048',
  reaction: 'scoreReaction',
  quiz: 'scoreDesiQuiz',
  desi: 'scoreDesiQuiz',
  tictactoe: 'scoreTicTacToe',
  ttt: 'scoreTicTacToe',
  carracer: 'scoreCarRacer',
  car: 'scoreCarRacer',
  spaceshooter: 'scoreSpaceShooter',
  space: 'scoreSpaceShooter',
};

const LEGACY_FIELD_MAP = {
  score2048: 'game2048HighScore',
  scoreReaction: 'reactionBestAvg',
  scoreDesiQuiz: 'desiQuizHighScore',
  scoreTicTacToe: 'tttWins',
  scoreCarRacer: 'carRacerHighScore',
  scoreSpaceShooter: 'spaceShooterHighScore',
};

const getScoreField = (game) => GAME_FIELD_MAP[game];

const syncLegacyScore = (user, field, score) => {
  const legacy = LEGACY_FIELD_MAP[field];
  if (!legacy) return;
  if (field === 'scoreReaction') {
    if (!user[legacy] || score < user[legacy]) user[legacy] = score;
  } else if (field === 'scoreTicTacToe') {
    user[legacy] = score;
  } else if (score > (user[legacy] || 0)) {
    user[legacy] = score;
  }
};

// POST /api/games/score
exports.saveGameScore = async (req, res) => {
  try {
    const { game, score } = req.body;
    const field = getScoreField(game);
    if (!field) return res.status(400).json({ error: 'Invalid game' });

    const user = await User.findById(req.userId);
    if (!user.gameScores) user.gameScores = {};

    const current = user.gameScores[field] ?? (field === 'scoreReaction' ? 9999 : 0);
    const isHigher = game === 'reaction' || field === 'scoreReaction'
      ? score < current || current === 0 || current === 9999
      : score > current;

    if (isHigher) {
      if (!user.gameScores) user.gameScores = {};
      user.set(`gameScores.${field}`, score);
      syncLegacyScore(user, field, score);
      await user.save();
      return res.json({ newHighScore: true, score });
    }
    res.json({ newHighScore: false, bestScore: current });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save score' });
  }
};

const saveMaxScore = async (userId, legacyField, gameField, score, lowerIsBetter = false) => {
  const user = await User.findById(userId);
  if (!user.gameScores) user.gameScores = {};
  const current = user.gameScores[gameField] ?? (lowerIsBetter ? 9999 : 0);
  const isBetter = lowerIsBetter
    ? score < current || current === 0 || current === 9999
    : score > current;

  if (isBetter) {
    user.gameScores[gameField] = score;
    syncLegacyScore(user, gameField, score);
    await user.save();
  }
  return user.gameScores[gameField];
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
    await saveMaxScore(req.userId, 'reactionBestAvg', 'scoreReaction', avgMs, true);

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

    const updated = await User.findById(req.userId);
    res.json({ avgMs, bestMs, personalBest: updated.reactionBestAvg });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save reaction score' });
  }
};

exports.getReactionLeaderboard = async (req, res) => {
  try {
    const leaderboard = await ReactionScore.find().sort({ avgMs: 1 }).limit(10).lean();
    res.json({ leaderboard });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
};

exports.save2048Score = async (req, res) => {
  try {
    const { score } = req.body;
    if (typeof score !== 'number' || score < 0) return res.status(400).json({ error: 'Invalid score' });
    const highScore = await saveMaxScore(req.userId, 'game2048HighScore', 'score2048', score);
    res.json({ highScore });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save score' });
  }
};

exports.saveDesiQuizScore = async (req, res) => {
  try {
    const { score } = req.body;
    if (typeof score !== 'number' || score < 0 || score > 10) {
      return res.status(400).json({ error: 'Invalid score' });
    }
    const highScore = await saveMaxScore(req.userId, 'desiQuizHighScore', 'scoreDesiQuiz', score);
    res.json({ highScore });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save score' });
  }
};

exports.saveCarRacerScore = async (req, res) => {
  try {
    const { score } = req.body;
    if (typeof score !== 'number' || score < 0) return res.status(400).json({ error: 'Invalid score' });
    const highScore = await saveMaxScore(req.userId, 'carRacerHighScore', 'scoreCarRacer', score);
    res.json({ highScore });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save score' });
  }
};

exports.saveSpaceShooterScore = async (req, res) => {
  try {
    const { score } = req.body;
    if (typeof score !== 'number' || score < 0) return res.status(400).json({ error: 'Invalid score' });
    const highScore = await saveMaxScore(req.userId, 'spaceShooterHighScore', 'scoreSpaceShooter', score);
    res.json({ highScore });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save score' });
  }
};

exports.saveTttWin = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const wins = (user.gameScores?.scoreTicTacToe || user.tttWins || 0) + 1;
    if (!user.gameScores) user.gameScores = {};
    user.gameScores.scoreTicTacToe = wins;
    user.tttWins = wins;
    await user.save();
    res.json({ tttWins: wins });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save' });
  }
};

exports.getGameStats = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select(
      'game2048HighScore reactionBestAvg desiQuizHighScore tttWins carRacerHighScore spaceShooterHighScore gameScores'
    );
    const gs = user.gameScores || {};
    res.json({
      stats: {
        game2048HighScore: gs.score2048 || user.game2048HighScore || 0,
        reactionBestAvg: gs.scoreReaction !== 9999 ? gs.scoreReaction : user.reactionBestAvg,
        desiQuizHighScore: gs.scoreDesiQuiz || user.desiQuizHighScore || 0,
        tttWins: gs.scoreTicTacToe || user.tttWins || 0,
        carRacerHighScore: gs.scoreCarRacer || user.carRacerHighScore || 0,
        spaceShooterHighScore: gs.scoreSpaceShooter || user.spaceShooterHighScore || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch game stats' });
  }
};

exports.getLeaderboard = async (req, res) => {
  try {
    const { game } = req.query;
    const field = getScoreField(game);
    if (!field) return res.status(400).json({ error: 'Unknown game key' });

    const isReaction = field === 'scoreReaction';
    const sortDir = isReaction ? 1 : -1;
    const filterQuery = { [`gameScores.${field}`]: isReaction ? { $gt: 0, $lt: 10000 } : { $gt: 0 } };

    const top10 = await User.find(filterQuery)
      .sort({ [`gameScores.${field}`]: sortDir })
      .limit(10)
      .select('displayName username avatarColor gameScores createdAt')
      .lean();

    let myRank = null;
    let myScore = null;
    if (req.userId) {
      const me = await User.findById(req.userId).select('gameScores').lean();
      const score = me?.gameScores?.[field];
      if (score && (!isReaction || score < 10000)) {
        myScore = score;
        const betterCount = await User.countDocuments(
          isReaction
            ? { [`gameScores.${field}`]: { $gt: 0, $lt: myScore } }
            : { [`gameScores.${field}`]: { $gt: myScore } }
        );
        myRank = betterCount + 1;
      }
    }

    const leaderboard = top10.map((u, i) => ({
      rank: i + 1,
      displayName: u.displayName || u.username,
      username: u.username,
      avatarColor: u.avatarColor || '#00F5FF',
      score: u.gameScores?.[field] || 0,
      createdAt: u.createdAt,
    }));

    res.json({ leaderboard, myRank, myScore });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
};
