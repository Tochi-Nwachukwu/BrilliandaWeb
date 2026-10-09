// Brillianda's service worker (plan: "v1 caches the app shell and shows a clear offline banner").
// It keeps the app's own files and one offline page, never a page with school data on it, so a
// shared phone holds no student records. Full offline data entry is after v1.
const VERSION = "v1";
const SHELL = `brillianda-shell-${VERSION}`;
const OFFLINE_URL = "/offline";

// The offline page and every file it needs, fetched fresh.
async function saveOfflinePage() {
  const cache = await caches.open(SHELL);
  const response = await fetch(OFFLINE_URL, { cache: "no-store" });
  if (!response.ok) return;
  const html = await response.clone().text();
  const files = [...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
  await cache.put(OFFLINE_URL, response);
  await Promise.all([...new Set(files)].map((url) => cache.add(url).catch(() => undefined)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(saveOfflinePage().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("brillianda-") && key !== SHELL).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  // The page asks after each deploy is loaded, so the offline page matches the current look.
  if (event.data === "refresh-offline-page") event.waitUntil(saveOfflinePage().catch(() => undefined));
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Pages: always from the network. Only when that fails, the saved offline page.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => (await caches.match(OFFLINE_URL)) ?? Response.error()));
    return;
  }

  // The app's own files never change under one name, so a saved copy is always right.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (saved) =>
          saved ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(SHELL).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
