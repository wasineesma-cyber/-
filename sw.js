const CACHE = 'donnote-v1';
const ASSETS = ['./icon-192.png', './icon-512.png', './apple-touch-icon.png', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isHTML = e.request.headers.get('accept')?.includes('text/html') || url.pathname.endsWith('.html') || url.pathname === '/';

  if (isHTML) {
    // Network-first for HTML: always get latest, fallback to cache if offline
    e.respondWith(
      fetch(e.request)
        .then(r => { caches.open(CACHE).then(c => c.put(e.request, r.clone())); return r; })
        .catch(() => caches.match(e.request))
    );
  } else {
    // Cache-first for icons/assets
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).catch(() => {}))
    );
  }
});
