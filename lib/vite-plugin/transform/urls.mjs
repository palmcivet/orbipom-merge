import { ORIGINAL_ASSET_BASE, SDK_ENTRY_URL, SDK_PUBLIC_PATH, siteUrl } from '../../config.mjs';

function baseReplacements(basePath) {
  const local = suffix => siteUrl(basePath, suffix);
  return [
    [ORIGINAL_ASSET_BASE, local('/site/')],
    ['https://web.hycdn.cn/static/js/umd/react-dom/react-dom@18.3.1.js', local('/shared/react-dom@18.3.1.js')],
    ['https://web.hycdn.cn/static/js/umd/react/react@18.3.1.js', local('/shared/react@18.3.1.js')],
    ['https://web.hycdn.cn/webview/static/fonts/', local('/shared/')],
    ['https://web-static.hg-cdn.com/webview/static/fonts/', local('/shared/')],
    [SDK_ENTRY_URL, local('/vendor/hg-web-sdk/sdk.entry.js')],
    [SDK_PUBLIC_PATH, local('/vendor/hg-web-sdk/3.0.3/')]
  ];
}

export function rewriteAssetUrls(source, context) {
  const pairs = [...baseReplacements(context.basePath), ...context.extraReplacements]
    .sort((left, right) => right[0].length - left[0].length);
  let rewritten = source;
  for (const [original, replacement] of pairs) {
    rewritten = rewritten.replaceAll(original, replacement);
  }
  return rewritten;
}
