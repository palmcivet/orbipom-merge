import { PATCH_TARGETS } from '../../../config.mjs';
import { replaceOnce } from '../replace.mjs';
import { rewriteAssetUrls } from '../urls.mjs';

const file = PATCH_TARGETS.entry;

export function patchEntry(source, context) {
  let patched = source;
  const swap = (needle, replacement, patch) => {
    patched = replaceOnce(patched, needle, replacement, { file, patch });
  };
  swap(
    't.exports=l}()},18683:',
    't.exports=window.orbipom.prepareSdk(l)}()},18683:',
    'prepare-sdk'
  );
  // The release build constant-folds the LQA flag. The panel links already use ?lqa=1.
  swap('l=!1,h=!1', 'l="1"===c.get("lqa"),h=!1', 'lqa-query');
  return rewriteAssetUrls(patched, context);
}
