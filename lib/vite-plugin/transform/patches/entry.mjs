import { PATCH_TARGETS } from '../../../config.mjs';
import { replaceOnce } from '../replace.mjs';
import { rewriteAssetUrls } from '../urls.mjs';

const file = PATCH_TARGETS.entry;

export function patchEntry(source, context) {
  const patched = replaceOnce(
    source,
    't.exports=l}()},18683:',
    't.exports=window.orbipom.prepareSdk(l)}()},18683:',
    { file, patch: 'prepare-sdk' }
  );
  return rewriteAssetUrls(patched, context);
}
