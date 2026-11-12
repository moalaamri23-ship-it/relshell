// RelShell service worker. Its only job is to make the shell installable as a
// PWA. Page navigations go to the network; nothing is cached, so deploys show
// up immediately. Only when the network is down does a navigation get a short
// offline page instead of the browser's error screen. Requests other than
// navigations (assets, the embedded apps' frames) are not intercepted.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return
  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response(
          '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
            '<title>RelShell offline</title>' +
            '<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0f172a;color:#cbd5e1;font-family:system-ui,sans-serif">' +
            '<p>RelShell needs a network connection. Reconnect and reload.</p></body>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
        ),
    ),
  )
})
