const User = require('../models/User');

// GET /api/users/search?q=
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const regex = new RegExp(q.trim(), 'i');
    const users = await User.find({
      $and: [
        { _id: { $ne: req.userId } },
        { $or: [{ username: regex }, { displayName: regex }] },
      ],
    })
      .select('username displayName avatarColor status lastSeen')
      .limit(20);

    res.json({ users: users.map(u => u.toPublicJSON()) });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/users/:userId
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: user.toPublicJSON() });
  } catch (error) {
    if (error.name === 'CastError') return res.status(404).json({ error: 'User not found' });
    res.status(500).json({ error: 'Server error' });
  }
};

// PUT /api/users/vibe — Update vibe status
const VALID_VIBES = ['available', 'gaming', 'listening', 'dnd', 'ghost', 'on-fire', 'chillin'];
exports.updateVibe = async (req, res) => {
  try {
    const { vibe } = req.body;
    if (!vibe || !VALID_VIBES.includes(vibe)) {
      return res.status(400).json({ error: 'Invalid vibe status' });
    }
    const user = await User.findByIdAndUpdate(
      req.userId,
      { vibe },
      { new: true }
    ).select('-password');
    res.json({ vibe: user.vibe, user: user.toPublicJSON() });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
