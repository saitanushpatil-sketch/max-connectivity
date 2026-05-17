const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getQuizQuestions,
  saveQuizScore,
  saveReactionScore,
  getReactionLeaderboard,
  saveMatchTime,
  getGameStats,
  getMatchMemes,
} = require('../controllers/gameController');

router.get('/quiz/questions', auth, getQuizQuestions);
router.post('/quiz/score', auth, saveQuizScore);
router.post('/reaction', auth, saveReactionScore);
router.get('/reaction/leaderboard', auth, getReactionLeaderboard);
router.get('/match/memes', auth, getMatchMemes);
router.post('/match', auth, saveMatchTime);
router.get('/stats', auth, getGameStats);

module.exports = router;
