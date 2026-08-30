const CACHE_NAME = 'hitotarawo-radio-v1';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './Radio-icon.png'
];

// インストール時：基本UIをキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// アクティベート時：古いキャッシュを削除
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
    })
  );
});

// フェッチ時：HTMLは完全除外、音源のみ動的キャッシュ
self.addEventListener('fetch', event => {
  const req = event.request;

  // HTMLリクエストはService Workerで処理しない（Live Serverの表示を守る）
  if (req.destination === 'document') {
    return;
  }

  event.respondWith(
    caches.match(req).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(req).then(networkResponse => {
        // 音源ファイルのみ動的キャッシュ
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (req.url.endsWith('.m4a') || req.url.endsWith('.mp3'))
        ) {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(req, networkResponse.clone());
          });
        }

        return networkResponse;
      }).catch(() => {
        // オフライン時の代替レスポンス（音源以外は何も返さない）
        if (req.url.endsWith('.m4a') || req.url.endsWith('.mp3')) {
          return new Response('オフラインです。音源が取得できません。', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        }

        return Response.error(); // ← これが重要
      });
    })
  );
});