const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { searchUsers, getUserById } = require('../controllers/userController');

router.get('/search', auth, searchUsers);
router.get('/:userId', auth, getUserById);

module.exports = router;
