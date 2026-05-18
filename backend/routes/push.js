const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// POST /api/push/subscribe
router.post('/subscribe', auth, async (req, res) => {
  try {
    const subscription = req.body.subscription || req.body;

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({ error: 'Invalid push subscription' });
    }

    await User.findByIdAndUpdate(req.userId, {
      pushSubscription: {
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime || null,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save push subscription' });
  }
});

// POST /api/push/unsubscribe
router.post('/unsubscribe', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.userId, { $unset: { pushSubscription: 1 } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove push subscription' });
  }
});

module.exports = router;
