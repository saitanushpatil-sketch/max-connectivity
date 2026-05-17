const Battle = require('../models/Battle');
const User = require('../models/User');
const { emitToUser, emitToUsers } = require('../socket/socketEmitter');

const BATTLE_MS = 24 * 60 * 60 * 1000;

const populateBattle = (query) =>
  query
    .populate('challenger', 'username displayName avatarColor')
    .populate('opponent', 'username displayName avatarColor')
    .populate('winner', 'username displayName avatarColor');

const awardBattleBadges = (user) => {
  if (user.battlesWon >= 5 && !user.badges.includes('meme_warrior')) user.badges.push('meme_warrior');
  if (user.battlesWon >= 20 && !user.badges.includes('meme_champion')) user.badges.push('meme_champion');
  if (user.battleWinStreak >= 10 && !user.badges.includes('undefeated')) user.badges.push('undefeated');
};

const finalizeBattle = async (battle) => {
  if (battle.status === 'completed' || battle.status === 'expired') return battle;

  const now = new Date();
  if (battle.status === 'pending' && now > battle.expiresAt) {
    battle.status = 'expired';
    await battle.save();
    return battle;
  }

  if (battle.status !== 'active') return battle;
  if (now <= battle.expiresAt) return battle;

  {
    let winnerId = null;
    if (battle.votes.challenger > battle.votes.opponent) winnerId = battle.challenger;
    else if (battle.votes.opponent > battle.votes.challenger) winnerId = battle.opponent;
    else winnerId = null;

    battle.status = 'completed';
    battle.winner = winnerId;

    if (winnerId) {
      const loserId =
        winnerId.toString() === battle.challenger.toString() ? battle.opponent : battle.challenger;

      const [winner, loser] = await Promise.all([
        User.findById(winnerId),
        User.findById(loserId),
      ]);

      if (winner) {
        winner.battlesWon += 1;
        winner.battleWinStreak += 1;
        awardBattleBadges(winner);
        await winner.save();
      }
      if (loser) {
        loser.battlesLost += 1;
        loser.battleWinStreak = 0;
        await loser.save();
      }
    }

    await battle.save();
    const populated = await populateBattle(Battle.findById(battle._id));
    emitToUsers([battle.challenger, battle.opponent], 'battle_completed', { battle: populated });
    return populated;
  }

  return battle;
};

const expireStaleBattles = async (userId) => {
  const stale = await Battle.find({
    $or: [{ challenger: userId }, { opponent: userId }],
    status: { $in: ['pending', 'active'] },
    expiresAt: { $lt: new Date() },
  });
  for (const b of stale) await finalizeBattle(b);
};

// POST /api/battles/challenge
exports.challenge = async (req, res) => {
  try {
    const { opponentId, meme } = req.body;
    if (!opponentId || !meme?.url || !meme?.name) {
      return res.status(400).json({ error: 'Opponent and meme are required' });
    }
    if (opponentId === req.userId) {
      return res.status(400).json({ error: 'Cannot challenge yourself' });
    }

    const opponent = await User.findById(opponentId);
    if (!opponent) return res.status(404).json({ error: 'Opponent not found' });

    const isFriend = req.user.friends?.some((f) => f.toString() === opponentId);
    if (!isFriend) return res.status(400).json({ error: 'Can only challenge friends' });

    const existing = await Battle.findOne({
      $or: [
        { challenger: req.userId, opponent: opponentId, status: { $in: ['pending', 'active'] } },
        { challenger: opponentId, opponent: req.userId, status: { $in: ['pending', 'active'] } },
      ],
    });
    if (existing) return res.status(400).json({ error: 'Active battle already exists with this user' });

    const battle = await Battle.create({
      challenger: req.userId,
      opponent: opponentId,
      status: 'pending',
      challengerMeme: {
        memeId: meme.memeId || meme._id,
        url: meme.url,
        name: meme.name,
      },
      expiresAt: new Date(Date.now() + BATTLE_MS),
    });

    const populated = await populateBattle(Battle.findById(battle._id));
    emitToUser(opponentId, 'battle_challenge', { battle: populated });
    res.status(201).json({ battle: populated });
  } catch (err) {
    console.error('Battle challenge error:', err);
    res.status(500).json({ error: 'Failed to create battle' });
  }
};

// PUT /api/battles/:id/accept
exports.accept = async (req, res) => {
  try {
    const { meme } = req.body;
    if (!meme?.url || !meme?.name) {
      return res.status(400).json({ error: 'Meme is required to accept' });
    }

    const battle = await Battle.findById(req.params.id);
    if (!battle) return res.status(404).json({ error: 'Battle not found' });
    if (battle.opponent.toString() !== req.userId) {
      return res.status(403).json({ error: 'Only the opponent can accept' });
    }
    if (battle.status !== 'pending') {
      return res.status(400).json({ error: 'Battle is not pending' });
    }

    battle.status = 'active';
    battle.opponentMeme = {
      memeId: meme.memeId || meme._id,
      url: meme.url,
      name: meme.name,
    };
    await battle.save();

    const populated = await populateBattle(Battle.findById(battle._id));
    emitToUser(battle.challenger, 'battle_accepted', { battle: populated });
    emitToUser(battle.opponent, 'battle_accepted', { battle: populated });
    res.json({ battle: populated });
  } catch (err) {
    console.error('Battle accept error:', err);
    res.status(500).json({ error: 'Failed to accept battle' });
  }
};

// PUT /api/battles/:id/vote
exports.vote = async (req, res) => {
  try {
    const { side } = req.body;
    if (!['challenger', 'opponent'].includes(side)) {
      return res.status(400).json({ error: 'Vote side must be challenger or opponent' });
    }

    let battle = await Battle.findById(req.params.id);
    if (!battle) return res.status(404).json({ error: 'Battle not found' });
    if (battle.status !== 'active') {
      return res.status(400).json({ error: 'Battle is not active' });
    }

    const uid = req.userId;
    if (battle.voters.some((v) => v.toString() === uid)) {
      return res.status(400).json({ error: 'Already voted in this battle' });
    }

    battle.voters.push(uid);
    battle.votes[side] += 1;
    await battle.save();

    let populated = await populateBattle(Battle.findById(battle._id));
    emitToUsers([battle.challenger, battle.opponent], 'battle_vote_update', { battle: populated });

    populated = await finalizeBattle(populated);
    res.json({ battle: populated });
  } catch (err) {
    console.error('Battle vote error:', err);
    res.status(500).json({ error: 'Failed to vote' });
  }
};

// GET /api/battles/active
exports.getActive = async (req, res) => {
  try {
    await expireStaleBattles(req.userId);
    const battles = await populateBattle(
      Battle.find({
        $or: [{ challenger: req.userId }, { opponent: req.userId }],
        status: { $in: ['pending', 'active'] },
      }).sort({ createdAt: -1 })
    );
    const finalized = [];
    for (const b of battles) {
      finalized.push(await finalizeBattle(b));
    }
    res.json({ battles: finalized });
  } catch (err) {
    console.error('Get active battles error:', err);
    res.status(500).json({ error: 'Failed to fetch battles' });
  }
};

// GET /api/battles/history
exports.getHistory = async (req, res) => {
  try {
    const battles = await populateBattle(
      Battle.find({
        $or: [{ challenger: req.userId }, { opponent: req.userId }],
        status: { $in: ['completed', 'expired'] },
      })
        .sort({ updatedAt: -1 })
        .limit(30)
    );
    res.json({ battles });
  } catch (err) {
    console.error('Get battle history error:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};

// GET /api/battles/stats
exports.getStats = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select(
      'battlesWon battlesLost battleWinStreak'
    );
    res.json({
      stats: {
        wins: user.battlesWon,
        losses: user.battlesLost,
        streak: user.battleWinStreak,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};
