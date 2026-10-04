import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { siteUrl } from './site.mjs';

const PINNED = new Set([
  'original/site/821.67c1cf.js',
  'original/site/index.3d8293.js',
  'original/site/965.fc780b.js',
  'hg-web-sdk/sdk.entry.js'
]);
const CDN_ASSET = /\.(?:png|jpe?g|gif|webp|svg|ico|mp3|wav|ogg|woff2?|ttf|otf)$/i;
const PROBE_URL = 'https://web.hycdn.cn/endfield/webview/unn3irGqmsvyaKnFbTug/act/orbipom-merge-XaVa5Tz/favicon-hg.ico';

function localPath(vendorPath, basePath) {
  if (vendorPath.startsWith('original/')) {
    return siteUrl(basePath, `/${vendorPath.slice('original/'.length)}`);
  }
  if (vendorPath.startsWith('hg-web-sdk/')) {
    return siteUrl(basePath, `/vendor/${vendorPath}`);
  }
  throw new Error(`No site path for ${vendorPath}`);
}

export function cdnAssetMap(snapshot, basePath) {
  const map = {};
  for (const file of snapshot.files) {
    if (!file.sourceUrl || PINNED.has(file.path)) {
      continue;
    }
    const react = file.path.endsWith('/react@18.3.1.js') || file.path.endsWith('/react-dom@18.3.1.js');
    if (!react && !CDN_ASSET.test(file.path)) {
      continue;
    }
    map[localPath(file.path, basePath)] = file.sourceUrl;
  }
  if (!Object.values(map).includes(PROBE_URL)) {
    throw new Error('CDN fallback map is missing the favicon probe.');
  }
  return map;
}

export async function writeCdnMap(snapshot, basePath, file) {
  await mkdir(path.dirname(file), { recursive: true });
  const map = cdnAssetMap(snapshot, basePath);
  await writeFile(file, `export const probeUrl = ${JSON.stringify(PROBE_URL)};\nexport default ${JSON.stringify(map)};\n`);
}
