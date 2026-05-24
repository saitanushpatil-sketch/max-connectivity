const CACHE_NAME = 'max-v2';
const OFFLINE_URL = '/offline';
const APP_ICON = '/icon-192.png';

const STATIC_ASSETS = ['/', '/offline', '/login'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ─── Push Notifications ────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'MAX', body: event.data.text() };
  }

  const {
    title, body, senderName, senderAvatar,
    conversationId, type, callType, url, timestamp,
  } = payload;

  const isCall = type === 'call';
  const notifTitle = isCall
    ? `📹 ${senderName || 'Someone'} is calling...`
    : `MAX · ${senderName || 'New message'}`;

  const options = {
    body: body || (isCall ? 'Incoming video call' : 'New message'),
    icon: APP_ICON,
    badge: APP_ICON,
    tag: conversationId || 'max-notification',
    renotify: true,
    requireInteraction: isCall,
    silent: false,
    timestamp: timestamp || Date.now(),
    vibrate: isCall
      ? [500, 200, 500, 200, 500, 200, 500]
      : [200, 100, 200],
    data: {
      url: url || '/chats',
      conversationId,
      type: type || 'message',
      callType,
    },
    actions: isCall ? [
      { action: 'accept', title: '✅ Accept' },
      { action: 'decline', title: '❌ Decline' },
    ] : [
      { action: 'reply', title: '💬 Reply' },
      { action: 'open', title: '📱 Open' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(notifTitle, options)
  );
});

// ─── Notification Click ────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { url, conversationId, type, callType } = event.notification.data || {};
  const action = event.action;

  let targetUrl = url || '/chats';

  if (action === 'accept' && type === 'call') {
    targetUrl = url || `/call/${conversationId}?incoming=true&type=${callType || 'video'}`;
  } else if (action === 'decline' && type === 'call') {
    // Just close — no navigation
    return;
  } else if (action === 'reply') {
    targetUrl = `${url || `/chat/${conversationId}`}?focus=input`;
  } else if (action === 'open' || !action) {
    targetUrl = url || `/chat/${conversationId}`;
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

// ─── Subscription Refresh ──────────────────────────────────────────

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: self.VAPID_PUBLIC_KEY,
    }).catch(() => { /* Handled on next login */ })
  );
});

// ─── Network-first fetch strategy ─────────────────────────────────

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return;
  if (event.request.url.includes('socket.io')) return;
  if (event.request.url.includes('giphy.com')) return;

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
