/* Study Hub PWA Service Worker
 * 策略:网络优先、缓存兜底 —— 有网时永远拿最新版(更新网站后重开即生效),
 * 无网时用上次缓存离线运行。学习数据不经过这里(在 localStorage),缓存的只是应用本身。 */
const CACHE = "study-hub-pwa-v6";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
const NET_TIMEOUT = 3000; // 网络竞速窗口:超过 3 秒直接用缓存(应对 github.io 被墙/慢网时的长时间白屏)
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith((async () => {
    const cached = await caches.match(e.request, { ignoreSearch: true });
    const network = fetch(e.request).then(r => {
      const cp = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, cp)).catch(() => {});
      return r;
    }).catch(() => null);
    if (cached) {
      // 已有缓存:给网络最多 3 秒,拿到就用最新,否则先用缓存(网络请求继续在后台更新缓存)
      const winner = await Promise.race([network, new Promise(res => setTimeout(() => res(null), NET_TIMEOUT))]);
      return winner || cached;
    }
    // 首次访问(无缓存):只能等网络
    const r = await network;
    return r || caches.match("./index.html");
  })());
});
