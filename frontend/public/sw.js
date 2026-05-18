const CACHE_NAME = 'max-v1';
const OFFLINE_URL = '/offline';

const STATIC_ASSETS = [
  '/',
  '/offline',
  '/login',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = { title: 'MAX', body: event.data?.text() || 'New notification' };
  }

  const title = payload.title || 'MAX Connectivity';
  const data = payload.data || {};
  const type = payload.type || 'message';

  const options = {
    body: payload.body || '',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [100, 50, 100, 50, 100],
    requireInteraction: type === 'call',
    tag: data.conversationId || 'max-notification',
    renotify: true,
    actions: type === 'message' ? [
      { action: 'reply', title: '💬 Reply' },
      { action: 'open', title: '📱 Open' }
    ] : [
      { action: 'accept', title: '✅ Accept' },
      { action: 'decline', title: '❌ Decline' }
    ],
    data: {
      url: data.url || '/chats',
      conversationId: data.conversationId,
      type
    },
    silent: false
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const data = event.notification.data || {};
  let targetUrl = data.url || '/chats';

  if (event.action === 'reply') {
    targetUrl += '?focus=input';
  } else if (event.action === 'accept') {
    targetUrl = `/call/${data.conversationId}`;
  } else if (event.action === 'decline') {
    // Just close the notification (done above)
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const origin = self.location.origin;
      const fullUrl = targetUrl.startsWith('http') ? targetUrl : `${origin}${targetUrl}`;

      for (const client of clientList) {
        if (client.url.startsWith(origin) && 'focus' in client) {
          if ('navigate' in client) {
            return client.navigate(fullUrl).then(() => client.focus());
          }
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(fullUrl);
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return;
  if (event.request.url.includes('socket.io')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match(OFFLINE_URL))
      )
  );
});
