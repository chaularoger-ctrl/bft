/* Service worker BFT HUB — funzionamento offline e installazione PWA.
 * Cambia CACHE_VERSION quando aggiorni l'app per forzare il refresh della cache. */
const CACHE_VERSION = 'bft-calc-v40';
// Cache media separata e NON versionata: il video pesante sopravvive agli update dell'app.
const MEDIA_CACHE = 'bft-media-v1';

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
  // Solo lo shell (leggero): l'install completa in fretta → readiness offline e banner update rapidi.
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)));
});

// La pagina chiede l'attivazione immediata quando l'utente tocca "Aggiorna".
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION && k !== MEDIA_CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
  // Precache del video fuori dal waitUntil: non ritarda l'attivazione né la prima apertura.
  caches.open(MEDIA_CACHE).then((c) =>
    c.match('./media/hero.mp4').then((hit) => { if (!hit) c.add('./media/hero.mp4').catch(() => {}); })
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Navigazione: stale-while-revalidate — avvio istantaneo dalla cache, aggiornamento in background.
  // Il banner "nuova versione" (bump CACHE_VERSION) avvisa quando serve ricaricare.
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((cached) => {
        const net = fetch(req).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put('./index.html', copy));
          }
          return res;
        }).catch(() => cached || caches.match('./'));
        return cached || net;
      })
    );
    return;
  }

  // Media (video hero): cache separata, cache-first, nessuna rivalidazione (file pesante e immutabile).
  if (url.origin === self.location.origin && url.pathname.indexOf('/media/') !== -1) {
    event.respondWith(
      caches.open(MEDIA_CACHE).then((c) =>
        c.match(req).then((hit) => hit ||
          fetch(req).then((res) => { if (res && res.status === 200) c.put(req, res.clone()); return res; })
        )
      )
    );
    return;
  }

  const isFont = RUNTIME_HOSTS.indexOf(url.hostname) !== -1;
  const sameOrigin = url.origin === self.location.origin;

  // Shell e font: cache-first, si scarica solo se manca (lo shell è versionato da CACHE_VERSION,
  // quindi non serve rivalidarlo a ogni caricamento).
  event.respondWith(
    caches.match(req).then((cached) => cached ||
      fetch(req).then((res) => {
        if (res && (res.ok || res.type === 'opaque') && (sameOrigin || isFont)) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => cached)
    )
  );
});
