import { createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

export function installNavigation() {
  const home = createHandlerBoundToURL('index.html');
  const play = createHandlerBoundToURL('play/index.html');
  registerRoute(new NavigationRoute(play, { allowlist: [/\/play\/?$/] }));
  registerRoute(new NavigationRoute(home, { denylist: [/\/play\//] }));
}
