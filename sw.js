// Service Worker de Music316: permite abrir la app SIN internet.
// Las canciones NO se guardan aquí, sino en IndexedDB (ver index.html).
const CACHE = 'music316-v10';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

// Cada archivo se guarda por separado: si uno falla (por ejemplo un ícono que falta),
// los demás se guardan igual y la app sigue funcionando sin internet.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.all(
        ASSETS.map((url) =>
          fetch(new Request(url, { cache: 'reload' }))
            .then((res) => { if (res.ok) return cache.put(url, res); })
            .catch(() => {})
        )
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Primero la copia guardada (abre al instante y sin internet) y por detrás se actualiza desde GitHub.
// Los cambios nuevos se ven al abrir la app la siguiente vez.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const isPage = req.mode === 'navigate';
    const cached = (await cache.match(req, { ignoreSearch: true })) ||
                   (isPage ? await cache.match('./index.html') : undefined);

    const refresh = fetch(req)
      .then((res) => {
        if (res && res.ok) cache.put(isPage ? './index.html' : req, res.clone()).catch(() => {});
        return res;
      })
      .catch(() => undefined);

    if (cached) {
      event.waitUntil(refresh);
      return cached;
    }
    const res = await refresh;
    return res || new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })());
});
