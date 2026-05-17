const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');
const mongoose = require('mongoose');

// POST /api/friends/request
exports.sendRequest = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    if (userId === req.userId) return res.status(400).json({ error: 'Cannot send request to yourself' });

    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ error: 'User not found' });

    // Already friends?
    const me = await User.findById(req.userId);
    if (me.friends.some(f => f.toString() === userId)) {
      return res.status(400).json({ error: 'Already friends' });
    }

    // Existing request?
    const existing = await FriendRequest.findOne({
      $or: [
        { sender: req.userId, receiver: userId },
        { sender: userId, receiver: req.userId },
      ],
      status: 'pending',
    });
    if (existing) return res.status(400).json({ error: 'Request already exists' });

    const request = await FriendRequest.create({ sender: req.userId, receiver: userId });
    await request.populate('sender receiver', 'username displayName avatarColor');
    res.status(201).json({ request });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ error: 'Request already sent' });
    console.error('Send request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// PUT /api/friends/respond
exports.respondToRequest = async (req, res) => {
  try {
    const { requestId, action } = req.body;
    if (!requestId || !['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'requestId and action (accept/reject) required' });
    }

    const request = await FriendRequest.findById(requestId);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.receiver.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request already responded to' });
    }

    request.status = action === 'accept' ? 'accepted' : 'rejected';
    await request.save();

    if (action === 'accept') {
      // Add to both friends lists
      await User.findByIdAndUpdate(req.userId, { $addToSet: { friends: request.sender } });
      await User.findByIdAndUpdate(request.sender, { $addToSet: { friends: req.userId } });
      
      // social_butterfly badge at 5 friends
      const me = await User.findById(req.userId);
      if (me.friends.length >= 5 && !me.badges.includes('social_butterfly')) {
        me.badges.push('social_butterfly');
        await me.save();
      }
    }

    res.json({ request, message: `Friend request ${action}ed` });
  } catch (error) {
    console.error('Respond error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/friends
exports.getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate(
      'friends',
      'username displayName avatarColor status lastSeen'
    );
    res.json({ friends: user.friends.map(f => f.toPublicJSON()) });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/friends/pending
exports.getPending = async (req, res) => {
  try {
    const incoming = await FriendRequest.find({ receiver: req.userId, status: 'pending' })
      .populate('sender', 'username displayName avatarColor status');
    const outgoing = await FriendRequest.find({ sender: req.userId, status: 'pending' })
      .populate('receiver', 'username displayName avatarColor status');
    res.json({ incoming, outgoing });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// DELETE /api/friends/:id
exports.removeFriend = async (req, res) => {
  try {
    const friendId = req.params.id;
    await User.findByIdAndUpdate(req.userId, { $pull: { friends: friendId } });
    await User.findByIdAndUpdate(friendId, { $pull: { friends: req.userId } });
    // Clean up accepted requests
    await FriendRequest.deleteMany({
      $or: [
        { sender: req.userId, receiver: friendId },
        { sender: friendId, receiver: req.userId },
      ],
    });
    res.json({ message: 'Friend removed' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
