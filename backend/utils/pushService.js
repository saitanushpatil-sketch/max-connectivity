const webpush = require('web-push');
const User = require('../models/User');

let configured = false;

const configureWebPush = () => {
  if (configured) return true;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL || 'mailto:admin@max-connectivity.app';

  if (!publicKey || !privateKey) {
    console.warn('⚠ Web Push: VAPID keys not configured — push notifications disabled');
    return false;
  }

  webpush.setVapidDetails(email, publicKey, privateKey);
  configured = true;
  return true;
};

const truncate = (text, max = 50) => {
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

    await webpush.sendNotification(
      user.pushSubscription,
      JSON.stringify(payload)
    );
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      await User.findByIdAndUpdate(userId, { $unset: { pushSubscription: 1 } });
      console.log(`🔕 Removed expired push subscription for user ${userId}`);
    } else {
      console.error('Push notification error:', err.message || err);
    }
  }
};

/**
 * Notify offline user of a new message.
 */
const sendMessagePush = async ({
  receiverId,
  senderDisplayName,
  content,
  conversationId,
  messageType,
  memeName,
}) => {
  const body =
    messageType === 'meme'
      ? `🎭 ${truncate(memeName || 'Meme', 48)}`
      : truncate(content, 50);

  await sendPushToUser(receiverId, {
    title: senderDisplayName || 'New message',
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      conversationId,
      url: `/chat/${conversationId}`,
    },
  });
};

module.exports = {
  configureWebPush,
  sendPushToUser,
  sendMessagePush,
};
