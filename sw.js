// PlayPal service worker: opens fast from what's saved on the phone, refreshes in the background, plus phone notifications
const CACHE = "pl-v12";
const CDN = /^(https:\/\/(cdn\.jsdelivr\.net|unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com))\//;
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(["./", "playpal-word.png", "led-trophy.png", "icon-192.png"]).catch(() => {}))); });
self.addEventListener("activate", e => e.waitUntil((async () => {
  const keys = await caches.keys(); await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))); await self.clients.claim();
})()));
const put = async (req, res) => { try { if (res && (res.ok || res.type === "opaque")) { const c = await caches.open(CACHE); await c.put(req, res.clone()); } } catch (e) {} return res; };
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET") return;
  const u = new URL(r.url);
  // libraries and fonts from outside: saved copy first (they never change for a given version)
  if (CDN.test(r.url)) { e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => put(r, res)))); return; }
  if (u.origin !== location.origin) return;
  const page = r.mode === "navigate" || /\.html$/.test(u.pathname) || u.pathname.endsWith("/");
  if (page) {
    // pages: always the newest version from the internet; the saved copy is only used when there is no internet at all
    e.respondWith(fetch(r.url, {cache: "no-cache", credentials: "same-origin"}).then(res => put(r, res)).catch(async () => (await caches.match(r)) || (await caches.match("./")) || Response.error()));
    return;
  }
  // images and sounds: from the internet (the phone's normal browser cache keeps it quick); saved copy only when offline
  e.respondWith(fetch(r).then(res => put(r, res)).catch(async () => (await caches.match(r)) || Response.error()));
});
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification((!d.title || d.title === "Padel Live" ? "PlayPal" : d.title), {
    body: d.body || "", icon: "icon-192.png", badge: "icon-192.png", tag: d.tag || undefined, renotify: !!d.tag, data: { url: d.url || "/#inbox" } }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close(); const url = (e.notification.data && e.notification.data.url) || "/#inbox";
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) { if ("focus" in c) { try { await c.navigate(url); } catch (x) {} return c.focus(); } }
    return self.clients.openWindow(url);
  })());
});
