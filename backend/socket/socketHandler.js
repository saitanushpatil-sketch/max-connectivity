const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Notification = require('../models/Notification');
const CallLog = require('../models/CallLog');

// Track online users: userId -> Set of socketIds
const onlineUsers = new Map();

const addUser = (userId, socketId) => {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socketId);
};

const removeUser = (userId, socketId) => {
  onlineUsers.get(userId)?.delete(socketId);
  if (onlineUsers.get(userId)?.size === 0) onlineUsers.delete(userId);
};

const isOnline = (userId) => onlineUsers.has(userId) && onlineUsers.get(userId).size > 0;

const emitToUser = (io, userId, event, data) => {
  const sockets = onlineUsers.get(userId?.toString());
  if (sockets) sockets.forEach((sid) => io.to(sid).emit(event, data));
};

// Export helpers for use by socketEmitter
const { setSocketHelpers } = require('./socketEmitter');

module.exports = (io) => {
  setSocketHelpers(io, (userId) => {
    const sockets = onlineUsers.get(userId?.toString());
    return sockets ? [...sockets] : [];
  });

  // Auth middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = (decoded.userId || decoded.id || decoded._id)?.toString();
      if (!socket.userId) return next(new Error('Invalid token payload'));

      // Session version check
      const user = await User.findById(socket.userId).select('sessionVersion username displayName avatarColor');
      if (!user) return next(new Error('User not found'));
      if (decoded.sessionVersion !== undefined && user.sessionVersion !== undefined) {
        if (decoded.sessionVersion !== user.sessionVersion) {
          return next(new Error('Session expired — logged in on another device'));
        }
      }
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token: ' + err.message));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    addUser(userId, socket.id);
    socket.join(userId); // join personal room for targeted emits

    try {
      await User.findByIdAndUpdate(userId, { status: 'online', lastSeen: new Date() });
      io.emit('user_status', { userId, status: 'online' });
    } catch {}

    console.log(`✅ Socket connected: ${userId} (${socket.id}) — ${onlineUsers.get(userId)?.size} connections`);

    // ==================== CONVERSATIONS ====================
    socket.on('join_conversation', ({ conversationId }) => {
      if (conversationId) socket.join(conversationId);
    });

    socket.on('leave_conversation', ({ conversationId }) => {
      if (conversationId) socket.leave(conversationId);
    });

    // ==================== MESSAGES ====================
    socket.on('send_message', async (data, callback) => {
      try {
        const {
          conversationId, receiverId, content,
          type = 'text', memeData, replyTo, disappearAfter,
        } = data;

        if (!conversationId || !content) {
          return callback?.({ error: 'Missing required fields' });
        }

        const expiresAt = disappearAfter && disappearAfter > 0
          ? new Date(Date.now() + disappearAfter * 60 * 60 * 1000)
          : null;

        const message = await Message.create({
          conversationId,
          sender: userId,
          content,
          type,
          ...(memeData && { memeData }),
          ...(replyTo && { replyTo }),
          ...(expiresAt && { expiresAt }),
          readBy: [userId],
        });

        const populated = await Message.findById(message._id)
          .populate('sender', 'username displayName avatarColor')
          .populate('replyTo', 'content type sender memeData deletedForEveryone');

        // Update conversation metadata
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: message._id,
          lastMessageAt: new Date(),
          ...(receiverId && { $inc: { [`unreadCounts.${receiverId}`]: 1 } }),
        }).catch(() => {});

        // Emit to conversation room (covers participants in the room)
        io.to(conversationId).emit('receive_message', { message: populated });

        // Notify receiver even if not in conversation room
        if (receiverId) {
          const notification = await Notification.create({
            userId: receiverId,
            type: 'message',
            title: socket.user.displayName || socket.user.username,
            body: type === 'text' ? content?.substring(0, 60) : `Sent a ${type}`,
            data: { conversationId, messageId: message._id },
          }).catch(() => null);

          emitToUser(io, receiverId, 'new_message_notification', {
            conversationId,
            message: populated,
            from: {
              userId,
              username: socket.user.username,
              displayName: socket.user.displayName,
              avatarColor: socket.user.avatarColor,
            },
            notification,
          });
        }

        // Confirm to sender
        socket.emit('message_sent', { message: populated });
        callback?.({ success: true, message: populated });
      } catch (err) {
        console.error('send_message error:', err.message);
        callback?.({ error: 'Failed to send message' });
      }
    });

    socket.on('react_message', async ({ messageId, emoji, conversationId }) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg) return;

        const existing = msg.reactions.find((r) => r.emoji === emoji);
        if (existing) {
          const idx = existing.users.findIndex((u) => u.toString() === userId);
          if (idx > -1) {
            existing.users.splice(idx, 1);
            if (existing.users.length === 0) {
              msg.reactions = msg.reactions.filter((r) => r.emoji !== emoji);
            }
          } else {
            existing.users.push(userId);
          }
        } else {
          msg.reactions.push({ emoji, users: [userId] });
        }

        await msg.save();
        io.to(conversationId).emit('message_reacted', { messageId, reactions: msg.reactions });
      } catch (err) {
        console.error('react_message error:', err.message);
      }
    });

    socket.on('mark_read', async ({ conversationId, senderId }) => {
      try {
        if (!conversationId || !senderId) return;
        await Message.updateMany(
          { conversationId, sender: senderId, readBy: { $ne: userId } },
          { $addToSet: { readBy: userId } }
        );
        // Reset unread count in Conversation model
        await Conversation.findByIdAndUpdate(conversationId, {
          [`unreadCounts.${userId}`]: 0,
        }).catch(() => {});
        emitToUser(io, senderId, 'messages_read', { conversationId, readBy: userId });
      } catch (err) {
        console.error('mark_read error:', err.message);
      }
    });

    // ==================== TYPING ====================
    socket.on('typing_start', ({ conversationId, receiverId }) => {
      if (receiverId) {
        emitToUser(io, receiverId, 'user_typing', {
          conversationId,
          userId,
          username: socket.user.username,
          displayName: socket.user.displayName,
        });
      }
    });

    socket.on('typing_stop', ({ conversationId, receiverId }) => {
      if (receiverId) {
        emitToUser(io, receiverId, 'user_stop_typing', { conversationId, userId });
      }
    });

    // ==================== CALLS ====================
    socket.on('call:initiate', async ({ to, offer, callType, callerName, callerAvatar }) => {
      try {
        if (!to) return;
        console.log(`📞 Call: ${userId} → ${to} (${callType})`);

        if (!isOnline(to)) {
          socket.emit('call:unavailable', { reason: 'User is offline' });
          return;
        }

        emitToUser(io, to, 'call:incoming', {
          from: userId,
          fromUser: {
            _id: userId,
            username: socket.user.username,
            displayName: socket.user.displayName,
            avatarColor: socket.user.avatarColor,
          },
          offer,
          callType,
          callerName: callerName || socket.user.displayName || socket.user.username,
          callerAvatar: callerAvatar || socket.user.avatarColor,
        });

        // Log call attempt
        await CallLog.create({
          caller: userId,
          receiver: to,
          callType,
          status: 'initiated',
          startedAt: new Date(),
        }).catch(() => {});
      } catch (err) {
        console.error('call:initiate error:', err.message);
      }
    });

    socket.on('call:answer', ({ to, answer }) => {
      if (to) emitToUser(io, to, 'call:answered', { answer, from: userId });
    });

    socket.on('call:ice-candidate', ({ to, candidate }) => {
      if (to && candidate) emitToUser(io, to, 'call:ice-candidate', { candidate, from: userId });
    });

    socket.on('call:end', async ({ to, duration }) => {
      if (to) emitToUser(io, to, 'call:ended', { from: userId });
      try {
        await CallLog.findOneAndUpdate(
          { caller: userId, receiver: to, status: 'initiated' },
          { status: 'completed', duration: duration || 0, endedAt: new Date() },
          { sort: { startedAt: -1 } }
        );
      } catch {}
    });

    socket.on('call:reject', async ({ to }) => {
      if (to) emitToUser(io, to, 'call:rejected', { from: userId });
      try {
        await CallLog.findOneAndUpdate(
          { caller: to, receiver: userId, status: 'initiated' },
          { status: 'rejected', endedAt: new Date() },
          { sort: { startedAt: -1 } }
        );
        // Create missed call notification
        await Notification.create({
          userId: to,
          type: 'call_missed',
          title: 'Missed Call',
          body: `Missed call from ${socket.user.displayName || socket.user.username}`,
          data: { from: userId },
        }).catch(() => {});
      } catch {}
    });

    socket.on('call:busy', ({ to }) => {
      if (to) emitToUser(io, to, 'call:busy', { from: userId });
    });

    // ==================== FRIENDS ====================
    socket.on('friend:request', async ({ to }) => {
      if (!to) return;
      emitToUser(io, to, 'friend:request', { from: userId });
      await Notification.create({
        userId: to,
        type: 'friend_request',
        title: 'Friend Request',
        body: `${socket.user.displayName || socket.user.username} wants to connect`,
        data: { from: userId },
      }).catch(() => {});
    });

    socket.on('friend:accept', async ({ to }) => {
      if (!to) return;
      emitToUser(io, to, 'friend:accepted', { from: userId });
      await Notification.create({
        userId: to,
        type: 'friend_accept',
        title: 'Friend Accepted',
        body: `${socket.user.displayName || socket.user.username} accepted your request`,
        data: { from: userId },
      }).catch(() => {});
    });

    // ==================== GAMES ====================
    socket.on('ttt_challenge', ({ opponentId, gameId }) => {
      if (opponentId) {
        emitToUser(io, opponentId, 'ttt_challenge', {
          from: userId,
          gameId,
          challenger: {
            _id: userId,
            username: socket.user.username,
            displayName: socket.user.displayName,
            avatarColor: socket.user.avatarColor,
          },
        });
      }
    });

    socket.on('ttt_move', ({ gameId, board, nextPlayer, opponentId }) => {
      if (opponentId) {
        emitToUser(io, opponentId, 'ttt_move', { gameId, board, nextPlayer, from: userId });
      }
    });

    socket.on('ttt_result', ({ gameId, winner, opponentId }) => {
      if (opponentId) {
        emitToUser(io, opponentId, 'ttt_result', { gameId, winner, from: userId });
      }
    });

    // ==================== DISCONNECT ====================
    socket.on('disconnect', async (reason) => {
      removeUser(userId, socket.id);
      console.log(`❌ Disconnected: ${userId} (${reason}) — ${onlineUsers.get(userId)?.size || 0} remaining`);

      if (!isOnline(userId)) {
        try {
          await User.findByIdAndUpdate(userId, { status: 'offline', lastSeen: new Date() });
          io.emit('user_status', { userId, status: 'offline', lastSeen: new Date() });
        } catch {}
      }
    });

    socket.on('error', (err) => {
      console.error(`Socket error for ${userId}:`, err.message);
    });
  });

  return io;
};
