const Meme = require('../models/Meme');
const { fetchAndSeedAll } = require('../services/memeService');

// GET /api/memes/feed?page=1&limit=20
exports.getFeed = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(40, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;
    const memes = await Meme.find({ nsfw: false })
      .sort({ upvotes: -1, usageCount: -1, createdAt: -1 })
      .skip(skip).limit(limit).lean();
    const total = await Meme.countDocuments({ nsfw: false });
    res.json({ memes, page, hasMore: skip + memes.length < total, total });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
};

// GET /api/memes/search?q=&category=&page=1&sort=trending
exports.searchMemes = async (req, res) => {
  try {
    const { q, category, sort = 'trending' } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const skip = (page - 1) * limit;
    const filter = { nsfw: false };
    if (category && category !== 'All') filter.category = category;
    if (q && q.trim()) {
      filter.$or = [
        { name: { $regex: q.trim(), $options: 'i' } },
        { tags: { $in: [q.trim().toLowerCase()] } },
        { subreddit: { $regex: q.trim(), $options: 'i' } },
      ];
    }
    const sortMap = { trending: { upvotes: -1, usageCount: -1 }, new: { createdAt: -1 }, top: { usageCount: -1 } };
    const sortOpt = sortMap[sort] || sortMap.trending;
    const [memes, total] = await Promise.all([
      Meme.find(filter).sort(sortOpt).skip(skip).limit(limit).lean(),
      Meme.countDocuments(filter),
    ]);
    res.json({ memes, total, page, hasMore: skip + memes.length < total });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
};

// GET /api/memes/trending
exports.getTrending = async (req, res) => {
  try {
    const memes = await Meme.find({ nsfw: false })
      .sort({ upvotes: -1, usageCount: -1 }).limit(20).lean();
    res.json({ memes });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
};

// GET /api/memes/category/:cat
exports.getByCategory = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const skip = (page - 1) * limit;
    const filter = { nsfw: false };
    if (req.params.cat !== 'All') filter.category = req.params.cat;
    const [memes, total] = await Promise.all([
      Meme.find(filter).sort({ upvotes: -1, usageCount: -1 }).skip(skip).limit(limit).lean(),
      Meme.countDocuments(filter),
    ]);
    res.json({ memes, total, page, hasMore: skip + memes.length < total });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
};

// GET /api/memes/random
exports.getRandom = async (req, res) => {
  try {
    const count = await Meme.countDocuments({ nsfw: false });
    const skip = Math.floor(Math.random() * Math.max(0, count - 10));
    const memes = await Meme.find({ nsfw: false }).skip(skip).limit(10).lean();
    res.json({ memes });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
};

// POST /api/memes/use/:id — increment usageCount
exports.markUsed = async (req, res) => {
  try {
    await Meme.findByIdAndUpdate(req.params.id, { $inc: { usageCount: 1 } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
};

// POST /api/memes/refresh — admin trigger
exports.triggerRefresh = async (req, res) => {
  res.json({ ok: true, message: 'Refresh started' });
  fetchAndSeedAll().catch(() => {});
};
