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
  saveSnakeScore,
  save2048Score,
  saveSimonScore,
  saveWhackScore,
  saveTyperScore,
  getTyperLeaderboard,
  saveWordleScore,
  saveFlappyScore,
  saveDesiQuizScore,
} = require('../controllers/gameController');

router.get('/quiz/questions', auth, getQuizQuestions);
router.post('/quiz/score', auth, saveQuizScore);
router.post('/reaction', auth, saveReactionScore);
router.get('/reaction/leaderboard', auth, getReactionLeaderboard);
router.get('/match/memes', auth, getMatchMemes);
router.post('/match', auth, saveMatchTime);
router.post('/snake/score', auth, saveSnakeScore);
router.post('/2048/score', auth, save2048Score);
router.post('/simon/score', auth, saveSimonScore);
router.post('/whack/score', auth, saveWhackScore);
router.post('/typer/score', auth, saveTyperScore);
router.get('/typer/leaderboard', auth, getTyperLeaderboard);
router.post('/wordle/score', auth, saveWordleScore);
router.post('/flappy/score', auth, saveFlappyScore);
router.post('/desi-quiz/score', auth, saveDesiQuizScore);
router.get('/stats', auth, getGameStats);

module.exports = router;
