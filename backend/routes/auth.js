// routes/auth.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  sendSignupOTP,
  verifySignupOTP,
  signup,
  sendLoginOTP,
  loginVerify,
  googleAuth,
  getMe,
  updateProfile,
} = require('../controllers/authController');

router.post('/send-otp', sendSignupOTP);
router.post('/verify-otp', verifySignupOTP);
router.post('/signup', signup);
router.post('/login-otp', sendLoginOTP);
router.post('/login-verify', loginVerify);
router.post('/google', googleAuth);
router.get('/me', auth, getMe);
router.put('/profile', auth, updateProfile);

module.exports = router;
