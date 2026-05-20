const GIPHY_KEY = process.env.GIPHY_API_KEY;

const searchGifs = async (q, limit, offset, type) => {
  const t = type === 'stickers' ? 'stickers' : 'gifs';
  const base = 'https://api.giphy.com/v1';
  const url = q
    ? `${base}/${t}/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}&rating=g`
    : `${base}/${t}/trending?api_key=${GIPHY_KEY}&limit=${limit}&rating=g`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Giphy API error');
  const json = await res.json();

  return {
    items: (json.data || []).map(g => ({
      id: g.id,
      title: g.title || 'GIF',
      url: g.images?.downsized_medium?.url
        || g.images?.fixed_height?.url
        || g.images?.original?.url,
      preview: g.images?.fixed_height_small?.url
        || g.images?.preview_gif?.url
        || g.images?.downsized_small?.mp4,
      isSticker: t === 'stickers',
    })),
    next: offset + limit,
  };
};

module.exports = { searchGifs };
