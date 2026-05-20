const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { searchGifs } = require('../services/gifService');

router.get('/search', auth, async (req, res) => {
  const { q = '', limit = 20, offset = 0, type = 'gifs' } = req.query;
  const result = await searchGifs(q, +limit, +offset, type);
  res.json(result);
});

module.exports = router;
