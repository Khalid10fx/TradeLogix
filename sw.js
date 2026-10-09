const CACHE = 'tradecycle-v4';
// Only small core pages are pre-cached. Big downloads (APK/EXE) and the Premium API are never cached.
const CORE = ['/', '/index.html', '/app/index.html', '/privacy.html', '/terms.html', '/manifest.webmanifest', '/assets/icon.svg'];
self.addEventListener('install', event => event.waitUntil(
  caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting())
));
self.addEventListener('activate', event => event.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', event => {
  const req = event.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/downloads/')) return;
  // Network first so new deploys show up; cache is the offline fallback.
  event.respondWith(
    fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match(url.pathname.startsWith('/app') ? '/app/index.html' : '/index.html') : undefined)))
  );
});
