/* 面试背诵 PWA Service Worker（照 Study Hub 的写法：网络优先、3 秒竞速、缓存兜底）
 * 只管 mianshi/ 这一层；只清自己（mianshi-）开头的旧缓存，不碰 Study Hub 的缓存。
 * 学习数据不经过这里（在 IndexedDB/localStorage），缓存的只是应用本身。 */
const CACHE = "mianshi-pwa-v5";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k.startsWith("mianshi-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
const NET_TIMEOUT = 3000;
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.registration.scope)) return;
  e.respondWith((async () => {
    const cached = await caches.match(e.request, { ignoreSearch: true, cacheName: CACHE });
    const network = fetch(e.request).then(r => {
      const cp = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, cp)).catch(() => {});
      return r;
    }).catch(() => null);
    if (cached) {
      const winner = await Promise.race([network, new Promise(res => setTimeout(() => res(null), NET_TIMEOUT))]);
      return winner || cached;
    }
    const r = await network;
    return r || caches.match("./index.html", { cacheName: CACHE });
  })());
});
