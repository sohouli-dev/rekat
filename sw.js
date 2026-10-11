const CACHE_NAME = 'rakaat-counter-v2';

// فایل‌های اصلی که باید برای اجرای آفلاین ذخیره شوند
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-512.png'
];

// مرحله نصب: فایل‌های ضروری پوسته برنامه کش می‌شوند
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// پاکسازی کش‌های قدیمی در صورت تغییر نسخه
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// مدیریت درخواست‌ها
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // استراتژی برای duas.json: اول اینترنت، اگر قطع بود استفاده از کش
  if (url.pathname.endsWith('duas.json')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // اگر اینترنت وصل بود و نسخه جدید دریافت شد، در کش هم ذخیره شود
          if (networkResponse && networkResponse.status === 200) {
            const resClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // اگر اینترنت قطع بود، از کش لود کن
          return caches.match(event.request);
        })
    );
    return;
  }

  // بقیه فایل‌ها (کد اصلی، آیکون و...): اول کش، سپس شبکه (Offline-First)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
