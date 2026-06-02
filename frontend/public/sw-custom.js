self.addEventListener('push', (e) => {
  const data = e.data?.json() || {};
  self.registration.showNotification(data.title || 'MAX', {
    body: data.body || 'New message',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    actions: [{ action: 'open', title: 'Open MAX' }],
  });
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url || '/'));
});
