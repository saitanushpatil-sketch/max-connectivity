const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

// GET /api/conversations — Get all conversations with last message
exports.getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.userId,
    })
      .populate('participants', 'username displayName avatarColor status lastSeen vibe')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username displayName avatarColor' },
      })
      .sort({ lastMessageAt: -1 })
      .limit(50);

    // Add unread count and identify other participant for 1-on-1 chats
    const result = conversations.map((conv) => ({
      ...conv.toObject(),
      unreadCount: conv.unreadCounts?.get(req.userId) || 0,
      otherParticipant: conv.isGroup
        ? null
        : conv.participants.find((p) => p._id.toString() !== req.userId),
    }));

    res.json({ success: true, conversations: result });
  } catch (err) {
    console.error('getConversations error:', err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/conversations/get-or-create — Get or create 1-on-1 conversation
exports.getOrCreate = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const participants = [req.userId, userId].sort();

    let conv = await Conversation.findOne({
      participants: { $all: participants, $size: 2 },
      isGroup: false,
    })
      .populate('participants', 'username displayName avatarColor status lastSeen vibe')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username displayName avatarColor' },
      });

    if (!conv) {
      conv = await Conversation.create({ participants, isGroup: false });
      conv = await conv.populate('participants', 'username displayName avatarColor status lastSeen vibe');
    }

    res.json({ success: true, conversation: conv });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/conversations/group — Create group conversation
exports.createGroup = async (req, res) => {
  try {
    const { name, participantIds, avatar } = req.body;
    if (!name || !participantIds?.length) {
      return res.status(400).json({ error: 'name and participantIds required' });
    }

    const participants = [...new Set([req.userId, ...participantIds])];

    const conv = await Conversation.create({
      participants,
      isGroup: true,
      groupName: name,
      groupAvatar: avatar,
      groupAdmin: req.userId,
    });

    const populated = await conv.populate(
      'participants',
      'username displayName avatarColor status lastSeen vibe'
    );
    res.json({ success: true, conversation: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/conversations/:id/theme — Update theme
exports.updateTheme = async (req, res) => {
  try {
    const { theme } = req.body;
    const conv = await Conversation.findOneAndUpdate(
      { _id: req.params.id, participants: req.userId },
      { theme },
      { new: true }
    );
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    res.json({ success: true, conversation: conv });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/conversations/:id/disappear — Update disappearing messages
exports.updateDisappear = async (req, res) => {
  try {
    const { disappearAfter } = req.body;
    const conv = await Conversation.findOneAndUpdate(
      { _id: req.params.id, participants: req.userId },
      { disappearAfter },
      { new: true }
    );
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    res.json({ success: true, conversation: conv });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/conversations/:id/read — Mark conversation as read
exports.markRead = async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.id);
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    conv.unreadCounts.set(req.userId, 0);
    await conv.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
