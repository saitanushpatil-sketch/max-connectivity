const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { searchGifs, getTrending, getCategories } = require('../services/gifService');

router.get('/trending', auth, async (req, res) => {
  try {
    const gifs = await getTrending(20);
    res.json({ gifs });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch trending' });
  }
});

router.get('/search', auth, async (req, res) => {
  try {
    const { q = 'funny', next = '', limit = 20 } = req.query;
    const result = await searchGifs(q, parseInt(limit, 10), next);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Failed to search' });
  }
});

router.get('/categories', auth, async (req, res) => {
  try {
    const cats = await getCategories();
    res.json({ categories: cats });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.get('/collection', auth, async (req, res) => {
  try {
    const collections = {
      tfi: ['allu arjun', 'prabhas', 'mahesh babu', 'ram charan', 'NTR', 'pushpa', 'RRR', 'baahubali', 'salaar', 'kalki'],
      hindi: ['bollywood', 'srk', 'salman khan', 'ranveer singh', 'dhoom', '3 idiots', 'desi funny', 'bhai', 'kapil sharma'],
      english: ['funny', 'reaction', 'meme', 'lol', 'epic fail', 'mind blown', 'shocked', 'happy dance', 'deal with it'],
    };
    const type = req.query.type || 'english';
    const queries = collections[type] || collections.english;
    const randomQuery = queries[Math.floor(Math.random() * queries.length)];
    const result = await searchGifs(randomQuery, 20);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
