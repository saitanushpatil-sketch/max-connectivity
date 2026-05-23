const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  saveScore,
  getStats,
  getLeaderboard,
} = require('../controllers/gameController');

router.post('/score', auth, saveScore);
router.get('/stats', auth, getStats);
router.get('/leaderboard', auth, getLeaderboard);

module.exports = router;
