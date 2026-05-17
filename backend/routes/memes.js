const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { searchMemes, getTrending } = require('../controllers/memeController');

router.get('/search', auth, searchMemes);
router.get('/trending', auth, getTrending);

module.exports = router;
