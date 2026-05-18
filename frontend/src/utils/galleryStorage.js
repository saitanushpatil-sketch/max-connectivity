const STORAGE_KEY = 'max_gallery_photos';
const MAX_PHOTOS = 50;

export function getGalleryPhotos() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getGalleryCount() {
  return getGalleryPhotos().length;
}

export function saveGalleryPhoto(dataUrl, caption = '') {
  const photos = getGalleryPhotos();
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    dataUrl,
    caption,
    createdAt: new Date().toISOString(),
  };
  photos.unshift(entry);
  const trimmed = photos.slice(0, MAX_PHOTOS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('max-gallery-updated'));
  return entry;
}

export function deleteGalleryPhoto(id) {
  const photos = getGalleryPhotos().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('max-gallery-updated'));
}

export function downloadPhoto(dataUrl, filename = 'max-photo.jpg') {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
