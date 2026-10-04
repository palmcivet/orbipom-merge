import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import manifest, { probeUrl } from '../lib/generated/cdn-manifest.js';
import { cdnPolicy, installCdnFallback } from './pwa/cdn-fallback.js';
import { installNavigation } from './pwa/navigation.js';

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
installNavigation();
installCdnFallback({ manifest, probeUrl, ...cdnPolicy });
