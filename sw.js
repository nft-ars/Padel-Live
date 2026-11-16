// Padel Live service worker: offline fallback + phone notifications
const CACHE = "pl-v7";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil((async () => {
  const keys = await caches.keys(); await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))); await self.clients.claim();
})()));
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET") return;
  const u = new URL(r.url); if (u.origin !== location.origin) return;
  e.respondWith((async () => {
    try { const res = await fetch(r); if (res && res.ok) { const c = await caches.open(CACHE); c.put(r, res.clone()); } return res; }
    catch (err) { const hit = await caches.match(r) || (r.mode === "navigate" ? await caches.match("index.html") || await caches.match("./") : null); if (hit) return hit; throw err; }
  })());
});
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Padel Live", {
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
