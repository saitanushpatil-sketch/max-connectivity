const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { sendOTP, sendWelcome } = require('../utils/mailer');

const JWT_EXPIRY = '30d';
const OTP_TTL_MS = 10 * 60 * 1000;
const VERIFIED_EMAIL_EXPIRY = '30m';

const generateToken = (userId, sessionVersion, deviceId) => {
  const payload = { userId };
  if (sessionVersion !== undefined) payload.sessionVersion = sessionVersion;
  if (deviceId) payload.deviceId = deviceId;
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRY });
};

const generateVerifiedEmailToken = (email) => {
  return jwt.sign(
    { email: email.toLowerCase(), purpose: 'email_verified' },
    process.env.JWT_SECRET,
    { expiresIn: VERIFIED_EMAIL_EXPIRY }
  );
};

const verifyVerifiedEmailToken = (token, email) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.purpose === 'email_verified' && decoded.email === email.toLowerCase();
  } catch {
    return false;
  }
};

const generateOTPCode = () => String(Math.floor(100000 + Math.random() * 900000));

const saveAndSendOTP = async (email) => {
  const normalized = email.toLowerCase().trim();
  const code = generateOTPCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await OTP.deleteMany({ email: normalized });
  await OTP.create({ email: normalized, code, expiresAt, used: false });

  const result = await sendOTP(normalized, code);
  return normalized;
};

const validateOTP = async (email, code) => {
  const normalized = email.toLowerCase().trim();
  const record = await OTP.findOne({ email: normalized, code: String(code).trim(), used: false });
  if (!record) return { ok: false, error: 'Invalid or expired code' };
  if (record.expiresAt < new Date()) return { ok: false, error: 'Code expired' };
  record.used = true;
  await record.save();
  return { ok: true, email: normalized };
};

const baseUsernameFromName = (name) => {
  const base = (name || 'operator')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 15);
  return base.length >= 3 ? base : 'operator';
};

const uniqueUsername = async (name) => {
  const base = baseUsernameFromName(name);
  let username = base;
  let attempt = 0;
  while (await User.findOne({ username })) {
    attempt += 1;
    username = `${base.slice(0, 15)}${attempt}`.slice(0, 20);
  }
  return username;
};

const finishLogin = async (user) => {
  user.status = 'online';
  user.lastSeen = new Date();
  user.updateStreak();
  user.checkBadges();
  await user.save();
  return {
    token: generateToken(user._id),
    user: user.toPublicJSON(),
  };
};

// POST /api/auth/send-otp
exports.sendSignupOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    await saveAndSendOTP(email);
    res.json({ message: 'OTP sent' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send verification code' });
  }
};

// POST /api/auth/verify-otp
exports.verifySignupOTP = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    const result = await validateOTP(email, code);
    if (!result.ok) return res.status(400).json({ error: result.error });

    const verifiedEmailToken = generateVerifiedEmailToken(result.email);
    res.json({ verified: true, email: result.email, verifiedEmailToken });
  } catch (error) {
    res.status(500).json({ error: 'Verification failed' });
  }
};

// POST /api/auth/signup
exports.signup = async (req, res) => {
  try {
    const { username, email, displayName, avatarColor, verifiedEmailToken } = req.body;

    if (!username || !email || !verifiedEmailToken) {
      return res.status(400).json({ error: 'Username, email, and verifiedEmailToken are required' });
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({ error: 'Username must be 3-20 chars, letters/numbers/underscores only' });
    }
    if (!verifyVerifiedEmailToken(verifiedEmailToken, email)) {
      return res.status(400).json({ error: 'Email not verified — complete OTP verification first' });
    }

    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: username.toLowerCase() }],
    });
    if (existingUser) {
      if (existingUser.email === normalizedEmail) return res.status(400).json({ error: 'Email already registered' });
      return res.status(400).json({ error: 'Username already taken' });
    }

    const user = new User({
      username: username.toLowerCase(),
      email: normalizedEmail,
      displayName: displayName || username,
      avatarColor: avatarColor || '#00F5FF',
    });

    const count = await User.countDocuments();
    if (count === 0) user.badges = ['early_adopter'];

    await user.save();
    sendWelcome(normalizedEmail, user.displayName).catch(() => {});

    const token = generateToken(user._id);
    res.status(201).json({ token, user: user.toPublicJSON() });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({ error: `${field} already exists` });
    }
    if (error.name === 'ValidationError') {
      const msg = Object.values(error.errors)[0].message;
      return res.status(400).json({ error: msg });
    }
    res.status(500).json({ error: 'Server error during signup' });
  }
};

// POST /api/auth/login-otp
exports.sendLoginOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: 'No account found with this email' });
    }

    await saveAndSendOTP(email);
    res.json({ message: 'OTP sent' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send access code' });
  }
};

// POST /api/auth/login-verify
exports.loginVerify = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    const result = await validateOTP(email, code);
    if (!result.ok) return res.status(400).json({ error: result.error });

    const user = await User.findOne({ email: result.email });
    if (!user) return res.status(400).json({ error: 'No account found with this email' });

    const session = await finishLogin(user);
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: 'Server error during login' });
  }
};

// POST /api/auth/google
exports.googleAuth = async (req, res) => {
  try {
    const { email, name, googleId } = req.body;
    if (!email || !googleId) {
      return res.status(400).json({ error: 'Email and googleId are required' });
    }

    const normalizedEmail = email.toLowerCase();
    let user = await User.findOne({
      $or: [{ email: normalizedEmail }, { googleId }],
    });

    if (!user) {
      const username = await uniqueUsername(name);
      user = new User({
        username,
        email: normalizedEmail,
        displayName: name || username,
        avatarColor: '#00F5FF',
        googleId,
      });

      const count = await User.countDocuments();
      if (count === 0) user.badges = ['early_adopter'];

      await user.save();
    } else {
      if (!user.googleId) user.googleId = googleId;
      if (name && !user.displayName) user.displayName = name;
    }

    const session = await finishLogin(user);
    res.json(session);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Account conflict — try again' });
    }
    if (error.name === 'ValidationError') {
      const msg = Object.values(error.errors)[0].message;
      return res.status(400).json({ error: msg });
    }
    res.status(500).json({ error: 'Server error during Google authentication' });
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
    res.status(500).json({ error: 'Server error' });
  }
};

// --- OWNER-ONLY LOGIN ---

// Simple in-memory rate limiter for brute force protection
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || now - record.firstAttempt > WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return true;
  }
  if (record.count >= MAX_ATTEMPTS) {
    const remaining = Math.ceil((WINDOW_MS - (now - record.firstAttempt)) / 60000);
    return remaining; // returns minutes remaining
  }
  record.count += 1;
  return true;
}

// POST /api/auth/owner-login
exports.ownerLogin = async (req, res) => {
  try {
    const { passphrase, deviceId } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';

    // Rate limit check
    const rateCheck = checkRateLimit(clientIp);
    if (rateCheck !== true) {
      return res.status(429).json({ 
        error: `Too many login attempts. Try again in ${rateCheck} minutes.`,
        code: 'RATE_LIMITED'
      });
    }

    if (!passphrase || !deviceId) {
      return res.status(400).json({ error: 'Passphrase and device ID are required' });
    }

    const ownerPassphrase = process.env.OWNER_PASSPHRASE;
    if (!ownerPassphrase) {
      return res.status(500).json({ error: 'Owner access not configured' });
    }

    // Validate passphrase (constant-time comparison to prevent timing attacks)
    const crypto = require('crypto');
    const inputHash = crypto.createHash('sha256').update(passphrase).digest('hex');
    const correctHash = crypto.createHash('sha256').update(ownerPassphrase).digest('hex');
    const match = crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(correctHash));

    if (!match) {
      return res.status(401).json({ error: 'Invalid access passphrase', code: 'INVALID_PASSPHRASE' });
    }

    // Clear rate limit on success
    loginAttempts.delete(clientIp);

    // Find or create owner account
    const ownerEmail = (process.env.OWNER_EMAIL || 'owner@max-connectivity.app').toLowerCase();
    let user = await User.findOne({ isOwner: true });

    if (!user) {
      // Try to find by email
      user = await User.findOne({ email: ownerEmail });
      if (user) {
        user.isOwner = true;
      } else {
        // Create owner account
        user = new User({
          username: 'saitanush',
          email: ownerEmail,
          displayName: 'Sai Tanush',
          avatarColor: '#00F5FF',
          isOwner: true,
          badges: ['early_adopter'],
        });
      }
    }

    // Bind to this device — invalidate all other sessions
    user.activeDeviceId = deviceId;
    user.sessionVersion = (user.sessionVersion || 0) + 1;
    user.status = 'online';
    user.lastSeen = new Date();
    user.updateStreak();
    user.checkBadges();
    await user.save();

    const token = generateToken(user._id, user.sessionVersion, deviceId);

    res.json({
      token,
      user: user.toPublicJSON(),
      deviceBound: true,
    });
  } catch (error) {
    console.error('Owner login error:', error);
    res.status(500).json({ error: 'Server error during authentication' });
  }
};

// POST /api/auth/logout
exports.logout = async (req, res) => {
  try {
    const { blacklistToken } = require('../middleware/tokenBlacklist');

    // Blacklist the current token in MongoDB (persists across restarts)
    const token = req.token || req.headers.authorization?.split(' ')[1];
    if (token) await blacklistToken(token);

    // Mark user offline
    await User.findByIdAndUpdate(req.userId, {
      status: 'offline',
      lastSeen: new Date(),
    });

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error during logout' });
  }
};

