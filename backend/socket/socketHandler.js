const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const { sendMessagePush } = require('../utils/pushService');

// Map: userId -> Set of socketIds (user can have multiple tabs)
const onlineUsers = new Map();

const addUser = (userId, socketId) => {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socketId);
};

const removeUser = (userId, socketId) => {
  if (!onlineUsers.has(userId)) return;
  onlineUsers.get(userId).delete(socketId);
  if (onlineUsers.get(userId).size === 0) onlineUsers.delete(userId);
};

const getUserSockets = (userId) => {
  return onlineUsers.has(userId) ? [...onlineUsers.get(userId)] : [];
};

const isOnline = (userId) => onlineUsers.has(userId) && onlineUsers.get(userId).size > 0;

const { setSocketHelpers } = require('./socketEmitter');

exports.getUserSockets = getUserSockets;
exports.isOnline = isOnline;

exports.initSocket = (io) => {
  setSocketHelpers(io, getUserSockets);
  // Auth middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Authentication error'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) return next(new Error('User not found'));
      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`🔌 Socket connected: ${userId} (${socket.id})`);

    addUser(userId, socket.id);

    // Update status to online
    await User.findByIdAndUpdate(userId, { status: 'online', lastSeen: new Date() });

    // Notify friends that user is online
    const user = await User.findById(userId).select('friends');
    if (user?.friends) {
      user.friends.forEach(friendId => {
        const friendSockets = getUserSockets(friendId.toString());
        friendSockets.forEach(sid => {
          io.to(sid).emit('user_status', { userId, status: 'online' });
        });
      });
    }

    // Join a conversation room
    socket.on('join_conversation', ({ conversationId }) => {
      socket.join(conversationId);
    });

    // Send message via socket (real-time delivery)
    socket.on('send_message', async (data, callback) => {
      try {
        const { conversationId, receiverId, content, type, memeData, replyTo } = data;
        if (!conversationId || !receiverId || !content) {
          return callback?.({ error: 'Missing required fields' });
        }

        const msg = await Message.create({
          conversationId,
          sender: userId,
          type: type || 'text',
          content,
          memeData: type === 'meme' ? memeData : undefined,
          replyTo: replyTo || null,
          readBy: [userId],
        });

        const populated = await Message.findById(msg._id)
          .populate('sender', 'username displayName avatarColor')
          .populate('replyTo', 'content type sender memeData deletedForEveryone');

        // Emit to conversation room
        io.to(conversationId).emit('receive_message', { message: populated });

        // Notify receiver even if not in conversation room
        const receiverSockets = getUserSockets(receiverId);
        if (receiverSockets.length > 0) {
          receiverSockets.forEach(sid => {
            io.to(sid).emit('new_message_notification', {
              conversationId,
              message: populated,
              from: { userId, username: socket.user.username, displayName: socket.user.displayName, avatarColor: socket.user.avatarColor },
            });
          });
        } else {
          // Receiver offline — Web Push notification
          sendMessagePush({
            receiverId,
            senderDisplayName: socket.user.displayName || socket.user.username,
            content,
            conversationId,
            messageType: type || 'text',
            memeName: memeData?.name,
          }).catch((err) => console.error('Push dispatch error:', err));
        }

        callback?.({ success: true, message: populated });
      } catch (err) {
        console.error('Socket send_message error:', err);
        callback?.({ error: 'Failed to send message' });
      }
    });

    // Typing indicators
    socket.on('typing_start', ({ conversationId, receiverId }) => {
      const receiverSockets = getUserSockets(receiverId);
      receiverSockets.forEach(sid => {
        io.to(sid).emit('user_typing', {
          conversationId,
          userId,
          username: socket.user.username,
          displayName: socket.user.displayName,
        });
      });
    });

    socket.on('typing_stop', ({ conversationId, receiverId }) => {
      const receiverSockets = getUserSockets(receiverId);
      receiverSockets.forEach(sid => {
        io.to(sid).emit('user_stop_typing', { conversationId, userId });
      });
    });

    // React to message
    socket.on('react_message', async ({ messageId, emoji, conversationId }) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg) return;

        const existing = msg.reactions.find(r => r.emoji === emoji);
        if (existing) {
          const idx = existing.users.findIndex(u => u.toString() === userId);
          if (idx > -1) {
            existing.users.splice(idx, 1);
            if (existing.users.length === 0) msg.reactions = msg.reactions.filter(r => r.emoji !== emoji);
          } else {
            existing.users.push(userId);
          }
        } else {
          msg.reactions.push({ emoji, users: [userId] });
        }

        await msg.save();
        io.to(conversationId).emit('message_reacted', { messageId, reactions: msg.reactions });
      } catch (err) {
        console.error('React error:', err);
      }
    });

    // Tic Tac Toe multiplayer
    socket.on('ttt_challenge', ({ opponentId, gameId }) => {
      const opponentSockets = getUserSockets(opponentId);
      opponentSockets.forEach((sid) => {
        io.to(sid).emit('ttt_challenge', {
          from: userId,
          gameId,
          challenger: {
            _id: userId,
            username: socket.user.username,
            displayName: socket.user.displayName,
            avatarColor: socket.user.avatarColor,
          },
        });
      });
    });

    socket.on('ttt_move', ({ gameId, board, nextPlayer, opponentId }) => {
      const opponentSockets = getUserSockets(opponentId);
      opponentSockets.forEach((sid) => {
        io.to(sid).emit('ttt_move', { gameId, board, nextPlayer, from: userId });
      });
    });

    socket.on('ttt_result', ({ gameId, winner, opponentId }) => {
      const opponentSockets = getUserSockets(opponentId);
      opponentSockets.forEach((sid) => {
        io.to(sid).emit('ttt_result', { gameId, winner, from: userId });
      });
    });

    // Mark messages as read
    socket.on('mark_read', async ({ conversationId, senderId }) => {
      try {
        await Message.updateMany(
          { conversationId, sender: senderId, readBy: { $ne: userId } },
          { $addToSet: { readBy: userId } }
        );
        // Notify sender their messages were read
        const senderSockets = getUserSockets(senderId);
        senderSockets.forEach(sid => {
          io.to(sid).emit('messages_read', { conversationId, readBy: userId });
        });
      } catch (err) {
        console.error('Mark read error:', err);
      }
    });

    // Disconnect
    socket.on('disconnect', async () => {
      console.log(`🔌 Socket disconnected: ${userId} (${socket.id})`);
      removeUser(userId, socket.id);

      if (!isOnline(userId)) {
        const lastSeen = new Date();
        await User.findByIdAndUpdate(userId, { status: 'offline', lastSeen });

        const user = await User.findById(userId).select('friends');
        if (user?.friends) {
          user.friends.forEach(friendId => {
            const friendSockets = getUserSockets(friendId.toString());
            friendSockets.forEach(sid => {
              io.to(sid).emit('user_status', { userId, status: 'offline', lastSeen });
            });
          });
        }
      }
    });
  });
};
