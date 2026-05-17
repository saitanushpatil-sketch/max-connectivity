const Meme = require('../models/Meme');

// 3-tier scoring engine
const scoreMemes = (memes, query) => {
  if (!query || !query.trim()) return memes;
  const q = query.trim().toLowerCase();
  const tokens = q.split(/\s+/);

  return memes
    .map(meme => {
      const nameLower = meme.name.toLowerCase();
      const allText = [meme.name, ...meme.tags, ...meme.keywords].join(' ').toLowerCase();

      let score = 0;
      if (nameLower === q) {
        score = 100 + meme.usageCount;
      } else if (nameLower.includes(q) || meme.tags.some(t => t === q) || meme.keywords.some(k => k === q)) {
        score = 50 + meme.usageCount;
      } else if (tokens.some(token => allText.includes(token))) {
        score = 25 + meme.usageCount;
      }

      return { ...meme.toObject(), score };
    })
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score);
};

// GET /api/memes/search?q=&category=
exports.searchMemes = async (req, res) => {
  try {
    const { q, category } = req.query;

    const filter = {};
    if (category && category !== 'All') filter.category = category;

    const memes = await Meme.find(filter).sort({ usageCount: -1 }).limit(100);

    const results = q ? scoreMemes(memes, q) : memes.map(m => m.toObject());

    res.json({ memes: results.slice(0, 30) });
  } catch (error) {
    console.error('Search memes error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/memes/trending
exports.getTrending = async (req, res) => {
  try {
    const memes = await Meme.find({ $or: [{ trending: true }, { usageCount: { $gt: 0 } }] })
      .sort({ usageCount: -1, trending: -1 })
      .limit(12);
    res.json({ memes });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
