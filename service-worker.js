const CACHE_NAME = 'nota-service-v1';
const urlsToCache = [
  '/',
  '/index.html',
  'https://html2canvas.hertzen.com/dist/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/esc-pos-encoder@1.2.0/dist/esc-pos-encoder.min.js',
  '/manifest.json'
];

// Install service worker dan cache aset penting
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Hapus cache lama saat aktivasi
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Strategi: network-first untuk HTML, cache-first untuk aset lain
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Untuk file HTML utama (index) gunakan network-first dengan fallback ke cache
  if (url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
  // Untuk aset statis (JS, CSS, manifest) gunakan cache-first
  else if (urlsToCache.includes(event.request.url) || 
           event.request.destination === 'script' || 
           event.request.destination === 'style' ||
           event.request.url.includes('html2canvas') ||
           event.request.url.includes('jspdf') ||
           event.request.url.includes('esc-pos-encoder')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
        .catch(() => new Response('Offline content not available', { status: 404 }))
    );
  }
  // Untuk request lain (API, gambar, dll) biarkan default (bisa ditambahkan strategi lain jika perlu)
  else {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
  }
});
