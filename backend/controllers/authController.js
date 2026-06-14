const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { sendOTP, sendWelcome } = require('../utils/mailer');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

// Initialize Firebase Admin (only once)
if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

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

// Firebase auth endpoint — verifies Firebase token, creates/updates user
exports.firebaseAuth = async (req, res) => {
  try {
    const { firebaseToken, email, displayName, photoURL, uid } = req.body;

    // Verify Firebase token
    const decoded = await getAuth().verifyIdToken(firebaseToken);
    if (decoded.uid !== uid) return res.status(401).json({ error: 'Invalid token' });

    // Find or create user in MongoDB
    let user = await User.findOne({ $or: [{ firebaseUid: uid }, { email }] });

    if (!user) {
      // New user
      const username = displayName?.replace(/\s+/g, '').toLowerCase() ||
                       email.split('@')[0] + Math.floor(Math.random() * 999);
      user = await User.create({
        firebaseUid: uid,
        email,
        username,
        displayName: displayName || username,
        avatar: photoURL || null,
        isVerified: decoded.email_verified || false,
      });
    } else {
      // Update existing user
      user.firebaseUid = uid;
      user.lastSeen = new Date();
      if (photoURL && !user.avatar) user.avatar = photoURL;
      await user.save();
    }

    // Generate our own JWT for socket auth
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        vibe: user.vibe,
        isOnline: true,
      }
    });
  } catch (err) {
    console.error('Firebase auth error:', err);
    res.status(401).json({ error: 'Authentication failed: ' + err.message });
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
