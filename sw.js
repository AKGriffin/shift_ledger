const CACHE_NAME = "shift-ledger-shell-v74";
const APP_SHELL = [
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./assets/css/style.css",
    "./assets/js/shift-math.js",
    "./assets/js/workplaces.js",
    "./assets/js/script.js",
    "./assets/icons/icon.svg",
    "./assets/icons/icon-192.png",
    "./assets/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
    );
});

// A new worker waits until the page asks it to take over, so the update prompt survives refreshes.
self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => Promise.all(
                cacheNames
                    .filter((cacheName) => cacheName.startsWith("shift-ledger-shell-")
                        && cacheName !== CACHE_NAME)
                    .map((cacheName) => caches.delete(cacheName))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const request = event.request;
    const requestUrl = new URL(request.url);

    if (request.method !== "GET" || requestUrl.origin !== self.location.origin) {
        return;
    }

    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const responseCopy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseCopy));
                    }
                    return response;
                })
                .catch(async () => (await caches.match(request)) || caches.match("./index.html"))
        );
        return;
    }

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(request).then((response) => {
                if (response.ok) {
                    const responseCopy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, responseCopy));
                }
                return response;
            });
        })
    );
});
