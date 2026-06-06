/**
 * Service Worker for Web Push Notifications.
 *
 * Place this file in the public/ directory.
 * Handles push events and shows notifications even when the app is closed.
 */

// Listen for push events
self.addEventListener('push', (event: any) => {
  const data = event.data?.json() || {};
  const options: NotificationOptions = {
    body: data.body || 'Nova notificação da Catequese Viva',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: data.tag || 'catequese-viva',
    data: { url: data.url || '/app' },
    vibrate: [200, 100, 200],
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
  };

  event.waitUntil(
    (self as any).registration.showNotification(
      data.title || 'Catequese Viva',
      options,
    ),
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event: any) => {
  event.notification.close();
  const url = event.notification.data?.url || '/app';

  event.waitUntil(
    (self as any).clients.matchAll({ type: 'window' }).then((clients: any[]) => {
      // If a window is already open, focus it
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if ((self as any).clients.openWindow) {
        return (self as any).clients.openWindow(url);
      }
    }),
  );
});

// Service Worker install
self.addEventListener('install', () => {
  (self as any).skipWaiting();
});

// Service Worker activate
self.addEventListener('activate', (event: any) => {
  event.waitUntil((self as any).clients.claim());
});
