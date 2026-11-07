const CACHE_NAME = 'insightboard-shell-v6';
const OFFLINE_URL = '/offline.html';
const APP_SHELL_URL = '/';
const ASSET_MANIFEST_URL = '/asset-manifest.json';
const PRECACHE_URLS = [
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/icons/insightboard.svg',
  '/icons/insightboard-192.png',
  '/icons/insightboard-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const shellResponse = await fetch(APP_SHELL_URL, { cache: 'reload' });
    if (!shellResponse.ok) throw new Error('Unable to fetch the InsightBoard app shell');
    await cache.put(APP_SHELL_URL, shellResponse.clone());
    await cache.addAll(PRECACHE_URLS);

    // Pre-cache all production JS/CSS bundles, including lazy chunks.
    const manifestResponse = await fetch(ASSET_MANIFEST_URL, { cache: 'no-store' });
    if (!manifestResponse.ok) throw new Error('Unable to fetch the production asset manifest');
    const assetManifest = await manifestResponse.json();
    const assets = [...new Set(Object.values(assetManifest).flatMap(entry => [
      entry.file,
      ...(entry.css || [])
    ]).filter(file => typeof file === 'string' && /\.(?:js|css)$/.test(file))
      .map(file => file.startsWith('/') ? file : '/' + file))];
    if (assets.length) await cache.addAll(assets);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Never cache authentication, database, account or other API responses.
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(APP_SHELL_URL, response.clone());
          if (url.pathname !== '/') await cache.put(request, response.clone());
        }
        return response;
      } catch {
        const cachedPage = await caches.match(request);
        return cachedPage || await caches.match(APP_SHELL_URL) || await caches.match(OFFLINE_URL);
      }
    })());
    return;
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        return cached || Response.error();
      }
    })());
  }
});


// Display server-originated push messages. A real push subscription and
// authenticated subscription-management API must be configured by the server.
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch {
    payload = { body: event.data ? event.data.text() : '' };
  }
  const title = typeof payload.title === 'string' && payload.title.trim()
    ? payload.title.slice(0, 80) : 'InsightBoard';
  const options = {
    body: typeof payload.body === 'string' ? payload.body.slice(0, 240) : 'You have a new update.',
    icon: '/icons/insightboard-192.png',
    badge: '/icons/insightboard-192.png',
    tag: typeof payload.tag === 'string' ? payload.tag.slice(0, 80) : 'insightboard-update',
    data: { url: typeof payload.url === 'string' && payload.url.startsWith('/') ? payload.url : '/' },
    renotify: false
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin) && 'focus' in client) {
        await client.navigate(targetUrl);
        return client.focus();
      }
    }
    return self.clients.openWindow(targetUrl);
  })());
});
