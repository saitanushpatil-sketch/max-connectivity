const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { searchUsers, getUserById, updateVibe } = require('../controllers/userController');

router.get('/search', auth, searchUsers);
router.put('/vibe', auth, updateVibe);
router.get('/:userId', auth, getUserById);

module.exports = router;
