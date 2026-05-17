const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const NEON_COLORS = ['#00F5FF', '#FF006E', '#06D6A0', '#FFB703', '#8B5CF6', '#F97316', '#EC4899'];

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[a-zA-Z0-9_]{3,20}$/, 'Username must be 3-20 chars, letters/numbers/underscores only'],
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  password: {
    type: String,
    minlength: 6,
    select: false,
    required: function () {
      return !this.googleId;
    },
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: 40,
    default: function () { return this.username; },
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 160,
    default: '',
  },
  avatarColor: {
    type: String,
    enum: NEON_COLORS,
    default: '#00F5FF',
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'away'],
    default: 'offline',
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  // Gamification
  streakCount: { type: Number, default: 0 },
  lastStreakDate: { type: Date },
  totalMemesSent: { type: Number, default: 0 },
  badges: {
    type: [String],
    enum: [
      'week_streak',
      'month_streak',
      'meme_lord',
      'early_adopter',
      'social_butterfly',
      'meme_warrior',
      'meme_champion',
      'undefeated',
    ],
    default: [],
  },
  battlesWon: { type: Number, default: 0 },
  battlesLost: { type: Number, default: 0 },
  battleWinStreak: { type: Number, default: 0 },
  quizHighScore: { type: Number, default: 0 },
  reactionBestAvg: { type: Number, default: null },
  memeMatchBestTime: { type: Number, default: null },
  // Friend list (stored as references for fast lookup)
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // Web Push subscription (endpoint + keys)
  pushSubscription: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Check and award badges
userSchema.methods.checkBadges = function () {
  const newBadges = [];
  if (this.streakCount >= 7 && !this.badges.includes('week_streak')) newBadges.push('week_streak');
  if (this.streakCount >= 30 && !this.badges.includes('month_streak')) newBadges.push('month_streak');
  if (this.totalMemesSent >= 50 && !this.badges.includes('meme_lord')) newBadges.push('meme_lord');
  if (newBadges.length > 0) {
    this.badges = [...new Set([...this.badges, ...newBadges])];
  }
  return newBadges;
};

// Update streak
userSchema.methods.updateStreak = function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!this.lastStreakDate) {
    this.streakCount = 1;
    this.lastStreakDate = today;
    return;
  }
  const last = new Date(this.lastStreakDate);
  last.setHours(0, 0, 0, 0);
  const diff = (today - last) / (1000 * 60 * 60 * 24);
  if (diff === 1) {
    this.streakCount += 1;
    this.lastStreakDate = today;
  } else if (diff > 1) {
    this.streakCount = 1;
    this.lastStreakDate = today;
  }
};

// Safe public profile (no password)
userSchema.methods.toPublicJSON = function () {
  return {
    _id: this._id,
    username: this.username,
    displayName: this.displayName,
    bio: this.bio,
    avatarColor: this.avatarColor,
    status: this.status,
    lastSeen: this.lastSeen,
    streakCount: this.streakCount,
    totalMemesSent: this.totalMemesSent,
    badges: this.badges,
    battlesWon: this.battlesWon,
    battlesLost: this.battlesLost,
    battleWinStreak: this.battleWinStreak,
    quizHighScore: this.quizHighScore,
    reactionBestAvg: this.reactionBestAvg,
    memeMatchBestTime: this.memeMatchBestTime,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
