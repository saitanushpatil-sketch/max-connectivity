const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: ['message', 'friend_request', 'friend_accept', 'call_missed', 'game_challenge', 'system'],
    required: true,
  },
  title: String,
  body: String,
  data: mongoose.Schema.Types.Mixed,
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, expires: 30 * 24 * 60 * 60 }, // TTL 30 days
});

module.exports = mongoose.model('Notification', notificationSchema);
