const CACHE_NAME = "rakaat-counter-v9";
const CACHE_PREFIX = "rakaat-counter-";

// فقط فایل‌هایی که واقعاً دارید:
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-512.png",
  "./duas.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(STATIC_ASSETS);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith(CACHE_PREFIX) &&
              key !== CACHE_NAME
          )
          .map((key) => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  // مدیریت فایل دعاها
  if (url.pathname.endsWith("/duas.json")) {
    const isUpdateCheck = url.searchParams.has("check");

    const cacheUrl = new URL(request.url);
    cacheUrl.search = "";
    cacheUrl.hash = "";

    const cacheKey = new Request(cacheUrl.href, {
      method: "GET"
    });

    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);

        try {
          const response = await fetch(request);

          if (response.ok) {
            await cache.put(cacheKey, response.clone());
          }

          return response;
        } catch (error) {
          if (isUpdateCheck) {
            throw error;
          }

          const cachedResponse = await cache.match(cacheKey);

          if (cachedResponse) {
            return cachedResponse;
          }

          return new Response("Offline", {
            status: 503,
            statusText: "Offline"
          });
        }
      })()
    );

    return;
  }

  // فایل‌های ناوبری صفحه
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);

        const cachedPage = await cache.match(request, {
          ignoreSearch: true
        });

        if (cachedPage) {
          return cachedPage;
        }

        const indexUrl = new URL(
          "./index.html",
          self.registration.scope
        ).href;

        const cachedIndex = await cache.match(indexUrl);

        if (cachedIndex) {
          return cachedIndex;
        }

        return fetch(request);
      })()
    );

    return;
  }

  // سایر فایل‌های برنامه (مثل همین icon-512.png)
  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(request);

      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request);
    })()
  );
});
