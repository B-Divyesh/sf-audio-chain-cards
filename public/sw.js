const VERSION = 'chain-cards-v1.0.0';
const SHELL = `${VERSION}-shell`;
const RUNTIME = `${VERSION}-runtime`;
const APP_SHELL = [
  '/',
  '/index.html',
  '/assets/app.js',
  '/assets/style.css',
  '/manifest.webmanifest',
  '/offline.html',
  '/privacy/',
  '/terms/',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/assets/hero-night-market-768.webp',
  '/assets/hero-night-market-1280.webp',
  '/assets/hero-night-market.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => ![SHELL, RUNTIME].includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(async () => (await caches.match(event.request.url, { ignoreSearch: true })) || (await caches.match('/index.html')) || caches.match('/offline.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request.url, { ignoreSearch: true }).then((cached) => cached || fetch(event.request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(RUNTIME).then((cache) => cache.put(event.request, copy));
      }
      return response;
    }))
  );
});
