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

const CACHE_VERSION = 'v2';
const CACHE_NAME = `catequese-viva-${CACHE_VERSION}`;

// ── App Shell resources (pre-cached on install) ──────────────────────
const APP_SHELL = [
  '/',
  '/app',
  '/manifest.json',
  '/favicon.svg',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/badge-72x72.png',
  '/og-image.webp',
];

// ── Runtime cache patterns ───────────────────────────────────────────
const STATIC_MATCH = /\/(icons|images|fonts|brand|locales)\//;
const API_MATCH = /\/api\//;

// ── Helper: open cache ───────────────────────────────────────────────
async function openCache() {
  return caches.open(CACHE_NAME);
}

// ── Helper: fetch and cache ──────────────────────────────────────────
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
    // No network & no cache — return a basic offline response for navigation
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
    const cached = await openCache().then(c => c.match(request));
    if (cached) return cached;
    throw err;
  }
}

// ── Install: pre-cache app shell ─────────────────────────────────────
self.addEventListener('install', (event) => {
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

// ── Activate: clean old caches ───────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
      );
    }).then(() => self.clients.claim()),
  );
});

// ── Fetch: routing strategies ────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin and navigation requests
  if (!url.origin.includes(self.location.origin) && request.mode !== 'navigate') {
    return;
  }

  // Skip non-GET
  if (request.method !== 'GET') return;

  // API calls: Network-First
  if (API_MATCH.test(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets: Cache-First
  if (STATIC_MATCH.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navigation (HTML): Network-First with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request).catch(() => cacheFirst(request)),
    );
    return;
  }

  // Everything else (JS bundles, CSS): Cache-First with background update
  event.respondWith(cacheFirst(request));
});

// ── Push notifications ───────────────────────────────────────────────
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

// ── Message: handle skipWaiting from client (for update flow) ────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
