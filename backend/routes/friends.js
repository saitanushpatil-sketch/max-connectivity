const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { sendRequest, respondToRequest, getFriends, getPending, removeFriend } = require('../controllers/friendController');

router.post('/request', auth, sendRequest);
router.put('/respond', auth, respondToRequest);
router.get('/', auth, getFriends);
router.get('/pending', auth, getPending);
router.delete('/:id', auth, removeFriend);

module.exports = router;
