const SHARE_CACHE = 'banknote-share-target';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handles images shared into the app from other apps (e.g. WhatsApp's
// "Share" sheet), registered via manifest.json's share_target. A service
// worker is the only way to receive that POST — the SPA has no server to
// handle it — so we grab the file here, stash it in Cache Storage, and
// hand off to the page via a redirect + query flag.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === 'POST' && url.pathname === '/share-target') {
    event.respondWith(handleShareTarget(event.request));
  }
});

async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('receipt');
    if (file && file.size > 0) {
      const cache = await caches.open(SHARE_CACHE);
      await cache.put('/shared-receipt', new Response(file, { headers: { 'Content-Type': file.type } }));
    }
  } catch {
    // No file, or the browser sent something unexpected — fall through to
    // a normal app open instead of failing the share.
  }
  return Response.redirect('/?shared=1', 303);
}
