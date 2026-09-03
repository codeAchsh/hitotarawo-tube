const CACHE_NAME = 'hitotarawo-radio-v9';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './Radio-icon.png'
];

// インストール時：基本UIをキャッシュし、すぐに新しいSWを有効化する
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// アクティベート時：古いキャッシュを削除し、開いているページもすぐ新SWの制御下にする
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// フェッチ時：HTMLは完全除外、それ以外はまずネットワークから取得し、失敗時のみキャッシュを使う
self.addEventListener('fetch', event => {
  const req = event.request;

  // HTMLリクエストはService Workerで処理しない（Live Serverの表示を守る）
  if (req.destination === 'document') {
    return;
  }

  event.respondWith(
    fetch(req).then(networkResponse => {
      if (networkResponse && networkResponse.status === 200) {
        const clone = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
      }
      return networkResponse;
    }).catch(() => {
      return caches.match(req).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        // オフライン時の代替レスポンス（音源のみ）
        if (req.url.endsWith('.m4a') || req.url.endsWith('.mp3')) {
          return new Response('オフラインです。音源が取得できません。', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        }

        return Response.error();
      });
    })
  );
});
