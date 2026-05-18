const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  saveGameScore,
  saveReactionScore,
  getReactionLeaderboard,
  save2048Score,
  saveDesiQuizScore,
  saveCarRacerScore,
  saveSpaceShooterScore,
  saveTttWin,
  getGameStats,
  getLeaderboard,
} = require('../controllers/gameController');

router.post('/score', auth, saveGameScore);
router.post('/reaction', auth, saveReactionScore);
router.get('/reaction/leaderboard', auth, getReactionLeaderboard);
router.post('/2048/score', auth, save2048Score);
router.post('/desi-quiz/score', auth, saveDesiQuizScore);
router.post('/car-racer/score', auth, saveCarRacerScore);
router.post('/space-shooter/score', auth, saveSpaceShooterScore);
router.post('/ttt/win', auth, saveTttWin);
router.get('/stats', auth, getGameStats);
router.get('/leaderboard', auth, getLeaderboard);

module.exports = router;
