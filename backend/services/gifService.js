const TENOR_KEY = process.env.TENOR_API_KEY;
const BASE = 'https://tenor.googleapis.com/v2';

const mapGif = (g) => ({
  id: g.id,
  title: g.title,
  url: g.media_formats?.gif?.url || g.media_formats?.tinygif?.url,
  preview: g.media_formats?.tinygif?.url,
  mp4: g.media_formats?.mp4?.url,
  width: g.media_formats?.gif?.dims?.[0],
  height: g.media_formats?.gif?.dims?.[1],
});

const searchGifs = async (query, limit = 20, next = '') => {
  const url = `${BASE}/search?q=${encodeURIComponent(query)}&key=${TENOR_KEY}&limit=${limit}&pos=${next}&media_filter=gif,tinygif,mp4`;
  const res = await fetch(url);
  const data = await res.json();
  return {
    gifs: (data.results || []).map(mapGif),
    next: data.next || '',
  };
};

const getTrending = async (limit = 20) => {
  const url = `${BASE}/featured?key=${TENOR_KEY}&limit=${limit}&media_filter=gif,tinygif`;
  const res = await fetch(url);
  const data = await res.json();
  return (data.results || []).map((g) => ({
    id: g.id,
    title: g.title,
    url: g.media_formats?.gif?.url,
    preview: g.media_formats?.tinygif?.url,
    mp4: g.media_formats?.mp4?.url,
  }));
};

const getCategories = async () => {
  const url = `${BASE}/categories?key=${TENOR_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.tags || [];
};

module.exports = { searchGifs, getTrending, getCategories };
