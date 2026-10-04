import { PATCH_TARGETS } from '../../config.mjs';
import { patchEntry } from './patches/entry.mjs';
import { patchGame } from './patches/game.mjs';
import { patchPlayHtml } from './patches/html.mjs';
import { patchLocale } from './patches/locale.mjs';
import { rewriteAssetUrls } from './urls.mjs';

const patches = new Map([
  [PATCH_TARGETS.game, patchGame],
  [PATCH_TARGETS.entry, patchEntry],
  [PATCH_TARGETS.locale, patchLocale]
]);

export function transformVendorSource(vendorPath, source, context) {
  const patch = patches.get(vendorPath);
  return patch ? patch(source, context) : rewriteAssetUrls(source, context);
}

export function renderPlayDocument(source, context) {
  return patchPlayHtml(source, context);
}
