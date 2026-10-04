import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import cdnMap, { probeUrl } from '../lib/generated/cdn-map.js';

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

const home = createHandlerBoundToURL('index.html');
const play = createHandlerBoundToURL('play/index.html');
registerRoute(new NavigationRoute(play, { allowlist: [/\/play\/?$/] }));
registerRoute(new NavigationRoute(home, { denylist: [/\/play\//] }));

const runtimeCache = 'orbipom-cdn';
let cdnMode = 'unknown';

async function probe() {
  try {
    const response = await fetch(probeUrl, {
      mode: 'cors',
      credentials: 'omit',
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
      signal: AbortSignal.timeout(5000)
    });
    cdnMode = response.ok ? 'up' : 'down';
  } catch {
    cdnMode = 'down';
  }
}

async function store(cache, request, response) {
  try {
    await cache.put(request, response.clone());
  } catch {
    // A full cache should not block the response.
  }
}

async function asBasic(remote) {
  const headers = new Headers(remote.headers);
  headers.delete('content-encoding');
  headers.delete('content-length');
  return new Response(await remote.arrayBuffer(), {
    status: remote.status,
    statusText: remote.statusText,
    headers
  });
}

async function preferCdn(request, cdnUrl) {
  const cache = await caches.open(runtimeCache);
  if (cdnMode !== 'down') {
    try {
      const remote = await fetch(cdnUrl, {
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
        signal: AbortSignal.timeout(8000)
      });
      if (remote.ok) {
        const basic = await asBasic(remote);
        await store(cache, request, basic);
        return basic;
      }
    } catch {
      cdnMode = 'down';
    }
  }
  try {
    const local = await fetch(request);
    if (local.ok) {
      await store(cache, request, local);
      return local;
    }
  } catch {
    // The Pages copy is unreachable; the runtime cache is the last copy.
  }
  const cached = await cache.match(request);
  if (cached) return cached;
  return fetch(request);
}

self.addEventListener('install', event => {
  event.waitUntil(probe().then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

registerRoute(
  ({ request, url }) => request.method === 'GET' && url.origin === self.location.origin && cdnMap[url.pathname],
  ({ request, url }) => preferCdn(request, cdnMap[url.pathname])
);
