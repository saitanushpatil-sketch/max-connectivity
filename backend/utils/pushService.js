const webpush = require('web-push');
const User = require('../models/User');

let configured = false;

const configureWebPush = () => {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL || 'mailto:admin@max-connectivity.app';
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(email, publicKey, privateKey);
  configured = true;
  return true;
};

const truncate = (text, max = 60) => {
  if (!text) return '';
  const str = String(text);
  return str.length <= max ? str : `${str.slice(0, max - 1)}…`;
};

/**
 * Send a Web Push notification to a user (if subscribed).
 */
const sendPushToUser = async (userId, payload) => {
  if (!configureWebPush()) return;
  try {
    const user = await User.findById(userId).select('pushSubscription');
    if (!user?.pushSubscription?.endpoint) return;
    await webpush.sendNotification(user.pushSubscription, JSON.stringify(payload), {
      TTL: 3600,
    });
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      await User.findByIdAndUpdate(userId, { $unset: { pushSubscription: 1 } });
    }
  }
};

/**
 * Send WhatsApp-style message push notification.
 */
const sendMessagePush = async ({
  receiverId,
  senderDisplayName,
  senderAvatar,
  content,
  conversationId,
  messageType,
}) => {
  const isGif = messageType === 'gif';
  const body =
    isGif
      ? '🎬 Sent you a GIF'
      : messageType === 'meme'
      ? '🎭 Sent you a meme'
      : truncate(content, 60);

  await sendPushToUser(receiverId, {
    // Title: "MAX · SenderName" matches WhatsApp style
    title: `MAX · ${senderDisplayName || 'New message'}`,
    body,
    // Top-level senderName so sw.js can use it in title
    senderName: senderDisplayName,
    senderAvatar: senderAvatar || null,
    type: 'message',
    conversationId,
    url: `/chat/${conversationId}`,
    timestamp: Date.now(),
  });
};

/**
 * Send incoming call push notification (requires user interaction).
 */
const sendCallPush = async ({
  receiverId,
  callerDisplayName,
  callerId,
  callType = 'video',
}) => {
  await sendPushToUser(receiverId, {
    title: `MAX · ${callerDisplayName || 'Incoming Call'}`,
    body: `${callerDisplayName || 'Someone'} is calling you`,
    senderName: callerDisplayName,
    type: 'call',
    callType,
    conversationId: callerId,
    url: `/call/${callerId}?incoming=true&type=${callType}`,
    timestamp: Date.now(),
  });
};

module.exports = {
  configureWebPush,
  sendPushToUser,
  sendMessagePush,
  sendCallPush,
};
