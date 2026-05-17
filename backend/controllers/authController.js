const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// POST /api/auth/signup
exports.signup = async (req, res) => {
  try {
    const { username, email, password, displayName, avatarColor } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] });
    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) return res.status(400).json({ error: 'Email already registered' });
      return res.status(400).json({ error: 'Username already taken' });
    }

    const user = new User({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      displayName: displayName || username,
      avatarColor: avatarColor || '#00F5FF',
    });

    // First user gets early_adopter badge
    const count = await User.countDocuments();
    if (count === 0) user.badges = ['early_adopter'];

    await user.save();

    const token = generateToken(user._id);
    res.status(201).json({
      token,
      user: user.toPublicJSON(),
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({ error: `${field} already exists` });
    }
    if (error.name === 'ValidationError') {
      const msg = Object.values(error.errors)[0].message;
      return res.status(400).json({ error: msg });
    }
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error during signup' });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier and password are required' });
    }

    const isEmail = identifier.includes('@');
    const query = isEmail
      ? { email: identifier.toLowerCase() }
      : { username: identifier.toLowerCase() };

    const user = await User.findOne(query).select('+password');
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Update status and streak
    user.status = 'online';
    user.lastSeen = new Date();
    user.updateStreak();
    user.checkBadges();
    await user.save();

    const token = generateToken(user._id);
    res.json({
      token,
      user: user.toPublicJSON(),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    res.json({ user: req.user.toPublicJSON() });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const { displayName, bio, avatarColor } = req.body;
    const NEON_COLORS = ['#00F5FF', '#FF006E', '#06D6A0', '#FFB703', '#8B5CF6', '#F97316', '#EC4899'];

    const updates = {};
    if (displayName !== undefined) {
      if (displayName.length > 40) return res.status(400).json({ error: 'Display name too long (max 40)' });
      updates.displayName = displayName.trim();
    }
    if (bio !== undefined) {
      if (bio.length > 160) return res.status(400).json({ error: 'Bio too long (max 160)' });
      updates.bio = bio.trim();
    }
    if (avatarColor !== undefined) {
      if (!NEON_COLORS.includes(avatarColor)) return res.status(400).json({ error: 'Invalid avatar color' });
      updates.avatarColor = avatarColor;
    }

    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true, runValidators: true });
    res.json({ user: user.toPublicJSON() });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
