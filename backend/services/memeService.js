/**
 * memeService.js — fetches memes from Imgflip, Memegen, Reddit
 * Uses Node 18 built-in fetch (no extra packages)
 */
const Meme = require('../models/Meme');

const REDDIT_SUBS = [
  { sub: 'memes',                   category: 'English' },
  { sub: 'dankmemes',               category: 'Dark' },
  { sub: 'me_irl',                  category: 'English' },
  { sub: 'terriblefacebookmemes',   category: 'English' },
  { sub: 'bollywoodmemes',          category: 'Hindi' },
  { sub: 'desimemes',               category: 'Desi' },
  { sub: 'telugumemes',             category: 'Telugu' },
  { sub: 'kollywood',               category: 'Telugu' },
];

const IMAGE_RE = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function safeFetch(url, opts = {}) {
  try {
    const res = await fetch(url, {
      ...opts,
      headers: { 'User-Agent': 'MAX-Connectivity-Bot/1.0', ...(opts.headers || {}) },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

// ── Imgflip ───────────────────────────────────────────────────────
async function fetchImgflip() {
  const data = await safeFetch('https://api.imgflip.com/get_memes');
  if (!data?.success) return [];
  return data.data.memes.map(m => ({
    name: m.name,
    url: m.url,
    source: 'imgflip',
    category: 'Reactions',
    isTemplate: true,
    tags: [m.name.toLowerCase()],
    width: m.width || 0,
    height: m.height || 0,
    upvotes: 0,
  }));
}

// ── Memegen ───────────────────────────────────────────────────────
async function fetchMemegen() {
  const data = await safeFetch('https://api.memegen.link/templates?limit=200');
  if (!Array.isArray(data)) return [];
  return data.slice(0, 200).map(t => ({
    name: t.name || t.id,
    url: t.blank,
    source: 'memegen',
    category: 'Templates',
    isTemplate: true,
    tags: [t.name?.toLowerCase() || t.id],
    upvotes: 0,
  })).filter(m => m.url && m.name);
}

// ── Reddit ────────────────────────────────────────────────────────
async function fetchRedditSub(sub, category) {
  const urls = [
    `https://www.reddit.com/r/${sub}/top.json?limit=100&t=week`,
    `https://www.reddit.com/r/${sub}/hot.json?limit=50`,
  ];
  const results = [];
  for (const url of urls) {
    await sleep(300);
    const data = await safeFetch(url);
    const posts = data?.data?.children || [];
    for (const { data: p } of posts) {
      if (p.over_18) continue; // skip nsfw
      const u = p.url || '';
      if (!IMAGE_RE.test(u) && !p.url_overridden_by_dest) continue;
      const imgUrl = IMAGE_RE.test(u) ? u : (p.preview?.images?.[0]?.source?.url || '').replace(/&amp;/g, '&');
      if (!imgUrl || !IMAGE_RE.test(imgUrl)) continue;
      results.push({
        name: (p.title || sub).slice(0, 120),
        url: imgUrl,
        source: 'reddit',
        subreddit: sub,
        category,
        upvotes: p.ups || 0,
        permalink: p.permalink ? `https://reddit.com${p.permalink}` : null,
        tags: [sub, category.toLowerCase()],
        isTemplate: false,
        nsfw: !!p.over_18,
      });
    }
  }
  return results;
}

// ── Main fetch & seed ─────────────────────────────────────────────
async function fetchAndSeedAll(log = console.log) {
  log('🎭 Starting meme fetch from all sources...');
  const all = [];

  // Imgflip
  const imgflip = await fetchImgflip();
  all.push(...imgflip);
  log(`  ✅ Imgflip: ${imgflip.length} templates`);

  // Memegen
  const memegen = await fetchMemegen();
  all.push(...memegen);
  log(`  ✅ Memegen: ${memegen.length} templates`);

  // Reddit
  for (const { sub, category } of REDDIT_SUBS) {
    const posts = await fetchRedditSub(sub, category);
    all.push(...posts);
    log(`  ✅ r/${sub}: ${posts.length} memes`);
    await sleep(500);
  }

  log(`📦 Total collected: ${all.length} | Deduplicating...`);

  // Dedup by URL
  const seen = new Set();
  const unique = all.filter(m => {
    if (!m.url || seen.has(m.url)) return false;
    seen.add(m.url);
    return true;
  });
  log(`📦 Unique memes: ${unique.length}`);

  // Upsert into MongoDB
  let saved = 0, skipped = 0;
  const now = new Date();
  for (const meme of unique) {
    try {
      await Meme.findOneAndUpdate(
        { url: meme.url },
        { ...meme, lastFetched: now, nsfw: false },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      saved++;
    } catch { skipped++; }
  }
  log(`✅ Saved: ${saved} | Skipped: ${skipped}`);
  return { saved, skipped, total: unique.length };
}

// ── Auto-refresh every 6 hours ────────────────────────────────────
function startMemeRefresh() {
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  const run = async () => {
    try { await fetchAndSeedAll(); }
    catch (e) { console.error('Meme refresh error:', e); }
  };
  // Initial run after 30s startup delay
  setTimeout(run, 30_000);
  setInterval(run, SIX_HOURS);
  console.log('🎭 Meme auto-refresh scheduled every 6 hours');
}

module.exports = { fetchAndSeedAll, startMemeRefresh };
