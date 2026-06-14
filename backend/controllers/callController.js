const CallLog = require('../models/CallLog');

// GET /api/calls/history — Get call history for current user
exports.getCallHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const calls = await CallLog.find({
      $or: [{ caller: req.userId }, { receiver: req.userId }],
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('caller', 'username displayName avatarColor')
      .populate('receiver', 'username displayName avatarColor')
      .lean();

    const total = await CallLog.countDocuments({
      $or: [{ caller: req.userId }, { receiver: req.userId }],
    });

    res.json({
      calls,
      pagination: { page, limit, total, hasMore: total > skip + calls.length },
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/calls/log — Log a call
exports.logCall = async (req, res) => {
  try {
    const { receiverId, callType, duration, status } = req.body;
    if (!receiverId || !status) {
      return res.status(400).json({ error: 'receiverId and status are required' });
    }

    const log = await CallLog.create({
      caller: req.userId,
      receiver: receiverId,
      callType: callType || 'video',
      duration: duration || 0,
      status,
      startedAt: new Date(),
      endedAt: duration ? new Date(Date.now() + duration * 1000) : new Date(),
    });

    res.status(201).json({ call: log });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
