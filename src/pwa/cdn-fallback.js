import { registerRoute } from 'workbox-routing';
import { LOAD_STATUS_TYPE } from './load-status.js';

export const cdnPolicy = {
  cacheName: 'orbipom-cdn',
  probeTimeoutMs: 5000,
  fetchTimeoutMs: 8000
};

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

export function installCdnFallback({ manifest, probeUrl, cacheName, probeTimeoutMs, fetchTimeoutMs }) {
  let cdnMode = 'unknown';
  let probeTask = null;
  const counts = { cdn: 0, local: 0, cache: 0 };

  function snapshot() {
    return {
      type: LOAD_STATUS_TYPE,
      cdnMode,
      counts: { cdn: counts.cdn, local: counts.local, cache: counts.cache }
    };
  }

  async function probe() {
    try {
      const response = await fetch(probeUrl, {
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
        cache: 'no-store',
        signal: AbortSignal.timeout(probeTimeoutMs)
      });
      cdnMode = response.ok ? 'up' : 'down';
    } catch {
      cdnMode = 'down';
    }
  }

  function ensureProbe() {
    if (cdnMode !== 'unknown') return Promise.resolve();
    probeTask ??= probe();
    return probeTask;
  }

  async function preferCdn(request, cdnUrl) {
    const cache = await caches.open(cacheName);
    if (cdnMode !== 'down') {
      try {
        const remote = await fetch(cdnUrl, {
          mode: 'cors',
          credentials: 'omit',
          redirect: 'follow',
          referrerPolicy: 'no-referrer',
          signal: AbortSignal.timeout(fetchTimeoutMs)
        });
        if (remote.ok) {
          const basic = await asBasic(remote);
          await store(cache, request, basic);
          counts.cdn += 1;
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
        counts.local += 1;
        return local;
      }
    } catch {
      // The Pages copy is unreachable; the runtime cache is the last copy.
    }
    const cached = await cache.match(request);
    if (cached) {
      counts.cache += 1;
      return cached;
    }
    const fallback = await fetch(request);
    if (fallback.ok) counts.local += 1;
    return fallback;
  }

  self.addEventListener('install', event => {
    event.waitUntil(ensureProbe().then(() => self.skipWaiting()));
  });
  self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
    if (cdnMode === 'unknown') ensureProbe();
  });
  self.addEventListener('message', event => {
    if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
    if (event.data?.type !== LOAD_STATUS_TYPE) return;
    const port = event.ports?.[0];
    const reply = () => {
      const payload = snapshot();
      if (port) port.postMessage(payload);
      else event.source?.postMessage(payload);
    };
    event.waitUntil(ensureProbe().then(reply, reply));
  });
  registerRoute(
    ({ request, url }) => request.method === 'GET' && url.origin === self.location.origin && manifest[url.pathname],
    ({ request, url }) => preferCdn(request, manifest[url.pathname])
  );
}
