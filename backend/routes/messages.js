const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getMessages, sendMessage, reactToMessage, deleteMessage, markRead } = require('../controllers/messageController');

router.get('/:convId', auth, getMessages);
router.post('/', auth, sendMessage);
router.post('/:id/react', auth, reactToMessage);
router.delete('/:id', auth, deleteMessage);
router.put('/:convId/read', auth, markRead);

module.exports = router;
