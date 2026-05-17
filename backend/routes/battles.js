const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  challenge,
  accept,
  vote,
  getActive,
  getHistory,
  getStats,
} = require('../controllers/battleController');

router.post('/challenge', auth, challenge);
router.get('/active', auth, getActive);
router.get('/history', auth, getHistory);
router.get('/stats', auth, getStats);
router.put('/:id/accept', auth, accept);
router.put('/:id/vote', auth, vote);

module.exports = router;
