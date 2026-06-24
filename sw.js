const CACHE_STATIC = 'agm-static-v15';
const CACHE_DYNAMIC = 'agm-dynamic-v15';

// Recursos críticos — siempre en caché
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo-ingenieros.jpg',
  './escudo-inf.png',
  './academia_general_militar.jpg',
  './icon-192.png',
  './icon-512.png',
];

// CDN externos — caché separado, no bloquea instalación
const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/fonts/tabler-icons.woff2',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_STATIC)
      .then(c => c.addAll(STATIC_ASSETS))
      .then(() => caches.open(CACHE_DYNAMIC).then(c => c.addAll(CDN_ASSETS).catch(() => {})))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_STATIC && k !== CACHE_DYNAMIC)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Solo manejamos GET
  if (e.request.method !== 'GET') return;

  // Estrategia: Network-first para index.html (siempre contenido fresco)
  if (url.pathname === '/' || url.pathname.endsWith('/index.html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_STATIC).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Estrategia: Cache-first para CDN (iconos, fuentes)
  if (url.hostname.includes('jsdelivr') || url.hostname.includes('cdn')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (!res || res.status !== 200) return res;
          const clone = res.clone();
          caches.open(CACHE_DYNAMIC).then(c => c.put(e.request, clone));
          return res;
        }).catch(() => cached || new Response('', {status: 503}));
      })
    );
    return;
  }

  // Resto (planning.pdf, manifest, etc.) — Cache-first con actualización en background
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE_DYNAMIC).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => null);
      return cached || fetchPromise || new Response('Sin conexión', {status: 503});
    })
  );
});

// Recibe mensaje del cliente para forzar actualización
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
