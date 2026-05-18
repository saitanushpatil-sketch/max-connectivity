const Message = require('../models/Message');
const User = require('../models/User');

const buildConvId = (a, b) => [a, b].sort().join('_');

// GET /api/messages/:convId?page=1
exports.getMessages = async (req, res) => {
  try {
    const { convId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 40;
    const skip = (page - 1) * limit;

    // Verify user is part of this conversation
    const [id1, id2] = convId.split('_');
    if (id1 !== req.userId && id2 !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const messages = await Message.find({
      conversationId: convId,
      deletedFor: { $ne: req.userId },
      deletedForEveryone: false,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username displayName avatarColor')
      .populate('replyTo', 'content type sender memeData deletedForEveryone')
      .lean();

    const total = await Message.countDocuments({ conversationId: convId, deletedForEveryone: false });

    res.json({
      messages: messages.reverse(),
      pagination: { page, limit, total, hasMore: total > skip + messages.length },
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/messages
exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, content, type, memeData, replyTo } = req.body;
    if (!receiverId || !content) return res.status(400).json({ error: 'receiverId and content required' });

    // Verify friendship
    const me = await User.findById(req.userId);
    if (!me.friends.some(f => f.toString() === receiverId)) {
      return res.status(403).json({ error: 'You can only message friends' });
    }

    const conversationId = buildConvId(req.userId, receiverId);

    const msg = await Message.create({
      conversationId,
      sender: req.userId,
      type: type || 'text',
      content,
      memeData: (type === 'meme' || type === 'gif') ? memeData : undefined,
      replyTo: replyTo || null,
      readBy: [req.userId],
    });

    if (type === 'gif' || type === 'meme') {
      me.totalMemesSent += 1;
      me.checkBadges();
    }

    // Update streak on message send
    me.updateStreak();
    await me.save();

    const populated = await msg.populate([
      { path: 'sender', select: 'username displayName avatarColor' },
      { path: 'replyTo', select: 'content type sender memeData deletedForEveryone' },
    ]);

    res.status(201).json({ message: populated });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/messages/:id/react
exports.reactToMessage = async (req, res) => {
  try {
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ error: 'Emoji required' });

    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    const existingReaction = msg.reactions.find(r => r.emoji === emoji);
    if (existingReaction) {
      const userIndex = existingReaction.users.findIndex(u => u.toString() === req.userId);
      if (userIndex > -1) {
        existingReaction.users.splice(userIndex, 1);
        if (existingReaction.users.length === 0) {
          msg.reactions = msg.reactions.filter(r => r.emoji !== emoji);
        }
      } else {
        existingReaction.users.push(req.userId);
      }
    } else {
      msg.reactions.push({ emoji, users: [req.userId] });
    }

    await msg.save();
    res.json({ reactions: msg.reactions });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// DELETE /api/messages/:id
exports.deleteMessage = async (req, res) => {
  try {
    const { forEveryone } = req.query;
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    if (forEveryone === 'true') {
      if (msg.sender.toString() !== req.userId) {
        return res.status(403).json({ error: 'Only sender can delete for everyone' });
      }
      msg.deletedForEveryone = true;
      msg.content = 'This message was deleted';
    } else {
      if (!msg.deletedFor.includes(req.userId)) {
        msg.deletedFor.push(req.userId);
      }
    }

    await msg.save();
    res.json({ message: 'Message deleted', deletedForEveryone: msg.deletedForEveryone });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// PUT /api/messages/:convId/read
exports.markRead = async (req, res) => {
  try {
    const { convId } = req.params;
    const { senderId } = req.body;
    if (!senderId) return res.status(400).json({ error: 'senderId required' });

    const result = await Message.updateMany(
      { conversationId: convId, sender: senderId, readBy: { $ne: req.userId } },
      { $addToSet: { readBy: req.userId } }
    );

    res.json({ modifiedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
