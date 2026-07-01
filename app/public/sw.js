/**
 * Catequese Viva — Service Worker
 *
 * Strategies:
 * - App Shell (HTML/CSS/JS/fonts): Cache-First with background update
 * - Static assets (icons/images): Cache-First
 * - API calls: Network-First with cache fallback
 * - Push notifications: standard Web Push
 *
 * Version is derived from CACHE_NAME for easy cache busting on deploy.
 */

const CACHE_VERSION = 'v3';
const CACHE_NAME = `catequese-viva-${CACHE_VERSION}`;
const IS_LOCAL_DEV =
  self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

const APP_SHELL = [
  '/',
  '/app',
  '/manifest.json',
  '/favicon.svg',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/badge-72x72.png',
  '/public-banner.webp',
];

const STATIC_MATCH = /\/(icons|images|fonts|brand|locales)\//;
const API_MATCH = /\/api\//;

async function openCache() {
  return caches.open(CACHE_NAME);
}

async function cacheFirst(request) {
  const cache = await openCache();
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    if (request.mode === 'navigate') {
      return cache.match('/offline') || new Response('Offline', { status: 503 });
    }
    throw new Error('Network unavailable');
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await openCache();
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await openCache().then((cache) => cache.match(request));
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener('install', (event) => {
  if (IS_LOCAL_DEV) {
    event.waitUntil(self.skipWaiting());
    return;
  }

  event.waitUntil(
    openCache().then((cache) => {
      return Promise.allSettled(
        APP_SHELL.map((url) =>
          fetch(url, { cache: 'no-cache' })
            .then((resp) => {
              if (resp.ok) cache.put(url, resp);
            })
            .catch(() => {}),
        ),
      );
    }),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  if (IS_LOCAL_DEV) {
    event.waitUntil(
      caches.keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .then(() => self.registration.unregister())
        .then(() => self.clients.matchAll({ type: 'window' }))
        .then((clients) => Promise.all(clients.map((client) => client.navigate(client.url))))
        .then(() => self.clients.claim()),
    );
    return;
  }

  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        );
      })
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (IS_LOCAL_DEV) return;

  const { request } = event;
  const url = new URL(request.url);

  if (!url.origin.includes(self.location.origin) && request.mode !== 'navigate') {
    return;
  }

  if (request.method !== 'GET') return;

  if (API_MATCH.test(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (STATIC_MATCH.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request).catch(() => cacheFirst(request)));
    return;
  }

  event.respondWith(cacheFirst(request));
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const options = {
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
    self.registration.showNotification(
      data.title || 'Catequese Viva',
      options,
    ),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/app';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    }),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
