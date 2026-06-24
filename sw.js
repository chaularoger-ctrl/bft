/* Service worker BFT CALC — funzionamento offline e installazione PWA.
 * Cambia CACHE_VERSION quando aggiorni l'app per forzare il refresh della cache. */
const CACHE_VERSION = 'bft-calc-v15';

// App shell: percorsi relativi alla posizione del service worker.
const APP_SHELL = [
  './',
  './index.html',
  './cloud-config.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/logo-feline.jpg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/favicon-16.png'
];

// Origini dei font Google: vanno messe in cache a runtime per l'uso offline.
const RUNTIME_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Navigazione (apertura dell'app): rete-prima, fallback alla cache offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  const isFont = RUNTIME_HOSTS.indexOf(url.hostname) !== -1;
  const sameOrigin = url.origin === self.location.origin;

  // Cache-first per shell e font; aggiorna in background quando online.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res && (res.ok || res.type === 'opaque') && (sameOrigin || isFont)) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
