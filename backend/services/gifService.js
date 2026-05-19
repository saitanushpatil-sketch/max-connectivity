const fetch = require('node-fetch');
const KEY = process.env.GIPHY_API_KEY;
const BASE = 'https://api.giphy.com/v1';

const mapGif = (g, type = 'gif') => ({
  id: g.id,
  title: g.title || '',
  url: g.images?.downsized?.url || g.images?.fixed_height?.url || '',
  preview: g.images?.fixed_height_small?.url || g.images?.preview_gif?.url || '',
  original: g.images?.original?.url || '',
  width: parseInt(g.images?.fixed_height?.width, 10) || 200,
  height: parseInt(g.images?.fixed_height?.height, 10) || 200,
  type: type === 'stickers' ? 'sticker' : 'gif',
});

const searchGifs = async (q, limit = 20, offset = 0, type = 'gifs') => {
  if (!KEY) throw new Error('GIPHY_API_KEY not set');
  const url = `${BASE}/${type}/search?api_key=${KEY}&q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}&rating=pg-13&lang=en`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Giphy error: ${res.status}`);
  const { data, pagination } = await res.json();
  return {
    items: (data || []).map((g) => mapGif(g, type)),
    total: pagination?.total_count || 0,
    offset: offset + (data?.length || 0),
    hasMore: (pagination?.total_count || 0) > offset + limit,
  };
};

const getTrending = async (limit = 20, type = 'gifs') => {
  if (!KEY) throw new Error('GIPHY_API_KEY not set');
  const url = `${BASE}/${type}/trending?api_key=${KEY}&limit=${limit}&rating=pg-13`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Giphy error: ${res.status}`);
  const { data } = await res.json();
  return {
    items: (data || []).map((g) => mapGif(g, type)),
    offset: limit,
    hasMore: true,
  };
};

const getCategories = async () => {
  if (!KEY) throw new Error('GIPHY_API_KEY not set');
  const url = `${BASE}/gifs/categories?api_key=${KEY}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const { data } = await res.json();
  return (data || []).slice(0, 20).map((c) => ({
    name: c.name,
    gif: c.gif ? mapGif(c.gif) : null,
  }));
};

module.exports = { searchGifs, getTrending, getCategories };
