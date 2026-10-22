// Retires the previous offline cache because it contained the protected app shell.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
        await self.registration.unregister();
        await self.clients.claim();
    })());
});
