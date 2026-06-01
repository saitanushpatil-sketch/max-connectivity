const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  sendRequest,
  respondToRequest,
  getFriends,
  getPending,
  removeFriend,
  toggleCloseFriend,
  getCloseFriends,
} = require('../controllers/friendController');

router.post('/request', auth, sendRequest);
router.put('/respond', auth, respondToRequest);
router.get('/', auth, getFriends);
router.get('/pending', auth, getPending);
router.get('/close-friends', auth, getCloseFriends);
router.post('/close-friend/:userId', auth, toggleCloseFriend);
router.delete('/:id', auth, removeFriend);

module.exports = router;
