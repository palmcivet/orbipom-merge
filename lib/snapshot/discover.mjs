const SDK_CHUNK = /return [A-Za-z]\+"\."\+(\{[^}]+\})\[[A-Za-z]\]\+"\.js"/g;
const SDK_CHUNK_PAIR = /(\d+):"([a-f0-9]+)"/g;
const SDK_ASSET = /assets\/[A-Za-z0-9_@.-]+\.(?:png|jpe?g|gif|webp|svg|css|js|json|woff2?|ttf)/g;
const REMOTE_URL = /https?:\/\/[^"'\\\s)<>]+/g;

export function discoverSdkFiles(source) {
  const files = new Set();
  for (const match of source.matchAll(SDK_CHUNK)) {
    for (const pair of match[1].matchAll(SDK_CHUNK_PAIR)) {
      files.add(`${pair[1]}.${pair[2]}.js`);
    }
  }
  for (const asset of source.matchAll(SDK_ASSET)) files.add(asset[0]);
  return files;
}

export function discoverRemoteAssets(source, { sdkBaseUrl, omittedRemoteAsset }) {
  const urls = [];
  for (const match of source.matchAll(REMOTE_URL)) {
    const url = match[0].replace(/[),.;]+$/, '');
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      continue;
    }
    if (!(parsed.hostname.endsWith('hycdn.cn') || parsed.hostname.endsWith('hg-cdn.com'))) continue;
    if (url.startsWith(sdkBaseUrl) || parsed.pathname.endsWith('/') || omittedRemoteAsset(url)) continue;
    urls.push(url);
  }
  return urls;
}
