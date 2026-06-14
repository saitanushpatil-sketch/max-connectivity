const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { searchGifs, getTrending, getCategories } = require('../services/gifService');
const {
  getFeed,
  searchMemes,
  getTrending: getMemeTrending,
  getByCategory,
  getRandom,
  markUsed,
  triggerRefresh,
} = require('../controllers/memeController');

// ─── Meme feed routes ────────────────────────────────────────────
router.get('/feed', auth, getFeed);
router.get('/search', auth, searchMemes);
router.get('/trending', auth, getMemeTrending);
router.get('/category/:cat', auth, getByCategory);
router.get('/random', auth, getRandom);
router.post('/use/:id', auth, markUsed);
router.post('/refresh', auth, triggerRefresh);

// ─── GIF sub-routes (kept for GifStickerPanel compat) ────────────
router.get('/gifs/trending', auth, async (req, res) => {
  try {
    const { type = 'gifs', limit = 20 } = req.query;
    const result = await getTrending(parseInt(limit, 10), type);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch trending', items: [] });
  }
});

router.get('/gifs/search', auth, async (req, res) => {
  try {
    const { q = 'funny', type = 'gifs', offset = 0, limit = 20 } = req.query;
    const result = await searchGifs(q, parseInt(limit, 10), parseInt(offset, 10), type);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Failed to search', items: [] });
  }
});

router.get('/gifs/categories', auth, async (req, res) => {
  try {
    const cats = await getCategories();
    res.json({ categories: cats });
  } catch (e) {
    res.status(500).json({ categories: [] });
  }
});

// ─── Collection route ────────────────────────────────────────────
router.get('/collection', auth, async (req, res) => {
  try {
    const collections = {
      tfi: ['allu arjun', 'prabhas', 'mahesh babu', 'ram charan', 'pushpa', 'RRR', 'baahubali'],
      hindi: ['bollywood', 'srk', 'salman khan', 'ranveer singh', 'desi funny'],
      english: ['funny', 'reaction', 'meme', 'lol', 'happy dance'],
    };
    const type = req.query.type || 'english';
    const queries = collections[type] || collections.english;
    const randomQuery = queries[Math.floor(Math.random() * queries.length)];
    const result = await searchGifs(randomQuery, 20, 0, 'gifs');
    res.json({ gifs: result.items });
  } catch (e) {
    res.status(500).json({ gifs: [] });
  }
});

module.exports = router;
