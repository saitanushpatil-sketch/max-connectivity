const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Session version check — ensures old tokens are invalidated when user logs in on a new device
    if (decoded.sessionVersion !== undefined && user.sessionVersion !== undefined) {
      if (decoded.sessionVersion !== user.sessionVersion) {
        return res.status(401).json({ error: 'Session expired — logged in on another device', code: 'DEVICE_CONFLICT' });
      }
    }

    // Device check — if user is owner, verify the device matches
    if (user.isOwner && user.activeDeviceId && decoded.deviceId) {
      if (decoded.deviceId !== user.activeDeviceId) {
        return res.status(401).json({ error: 'Access denied — wrong device', code: 'DEVICE_CONFLICT' });
      }
    }

    req.user = user;
    req.userId = user._id.toString();
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = auth;
