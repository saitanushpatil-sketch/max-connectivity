const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { searchGifs } = require('../services/gifService');

// Search GIFs (auth optional for better UX)
router.get('/search', auth, async (req, res) => {
  try {
    const { q = '', limit = 20, offset = 0, type = 'gifs' } = req.query;
    const result = await searchGifs(q, +limit, +offset, type);
    res.json(result);
  } catch (err) {
    console.error('GIF search error:', err.message);
    res.status(500).json({ error: 'Failed to search GIFs', items: [] });
  }
});

// Trending GIFs
router.get('/trending', auth, async (req, res) => {
  try {
    const { limit = 20, offset = 0, type = 'gifs' } = req.query;
    const result = await searchGifs('', +limit, +offset, type);
    res.json(result);
  } catch (err) {
    console.error('GIF trending error:', err.message);
    res.status(500).json({ error: 'Failed to fetch trending GIFs', items: [] });
  }
});

module.exports = router;
