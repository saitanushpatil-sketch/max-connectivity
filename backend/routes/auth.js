// routes/auth.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { signup, login, googleAuth, getMe, updateProfile } = require('../controllers/authController');

router.post('/signup', signup);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/me', auth, getMe);
router.put('/profile', auth, updateProfile);

module.exports = router;
