import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const repoRoot = path.resolve(here, '..');
export const sourceRoot = path.join(repoRoot, 'src');
export const vendorRoot = path.join(repoRoot, 'vendor');
export const originalRoot = path.join(vendorRoot, 'original');
export const sdkRoot = path.join(vendorRoot, 'hg-web-sdk');
export const snapshotFile = path.join(vendorRoot, 'snapshot.json');
export const cdnManifestFile = path.join(repoRoot, 'lib/generated/cdn-manifest.js');
export const telemetryStubFile = path.join(sourceRoot, 'offline/no-telemetry.js');
export const officialHtmlFile = path.join(originalRoot, 'official-index.html');

export const ORIGINAL_RELEASE = 'v1d5-synthesize-tuantuan-web@1.1.2';
export const SDK_NAME = 'hg-web-sdk';
export const SDK_VERSION = '3.0.3';

export const CONTENT_SECURITY_POLICY = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'";

export const ORIGINAL_ASSET_BASE = 'https://web.hycdn.cn/endfield/webview/unn3irGqmsvyaKnFbTug/act/orbipom-merge-XaVa5Tz/';
export const SDK_ENTRY_URL = 'https://web.hycdn.cn/hg_web_sdk/lib/sdk.entry.js';
export const SDK_PUBLIC_PATH = 'https://web.hycdn.cn/hg_web_sdk/lib/3.0.3/';
export const SHARED_FONT_BASE = 'https://web.hycdn.cn/webview/static/fonts/';
export const BLOCKED_API_ORIGIN = 'https://ef-webview.hypergryph.com/act-server/orbipom-merge';
export const PROBE_URL = 'https://web.hycdn.cn/endfield/webview/unn3irGqmsvyaKnFbTug/act/orbipom-merge-XaVa5Tz/favicon-hg.ico';
export const FETCH_USER_AGENT = 'orbipom-offline-vendor';

export const TELEMETRY_SOURCES = [
  'https://web.hycdn.cn/webview/static/scripts/eventLog_4_2_0.js',
  'https://web-static.hg-cdn.com/webview/static/scripts/eventLog_4_2_0.js'
];

export const PATCH_TARGETS = {
  game: 'original/site/821.67c1cf.js',
  entry: 'original/site/index.3d8293.js',
  locale: 'original/site/965.fc780b.js'
};

export const PINNED_VENDOR_FILES = new Set([
  PATCH_TARGETS.game,
  PATCH_TARGETS.entry,
  PATCH_TARGETS.locale,
  'hg-web-sdk/sdk.entry.js'
]);

export const CDN_ASSET = /\.(?:png|jpe?g|gif|webp|svg|ico|mp3|wav|ogg|woff2?|ttf|otf)$/i;

export const PUBLIC_PATHS = {
  telemetryStub: '/offline/no-telemetry.js',
  runtimeScript: '/offline/index.js',
  blockedApi: '/offline/blocked-original-api',
  playGame: '/play/game.html'
};

export function normalizeBase(basePath) {
  if (basePath == null) return '';
  const trimmed = String(basePath).trim();
  if (trimmed === '' || trimmed === '/') return '';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.replace(/\/+$/, '');
}

export function viteBase(basePath) {
  const normalized = normalizeBase(basePath);
  return normalized ? `${normalized}/` : '/';
}

export function siteUrl(basePath, suffix) {
  const pathSuffix = suffix.startsWith('/') ? suffix : `/${suffix}`;
  return `${normalizeBase(basePath)}${pathSuffix}`;
}

export function cspMeta() {
  return `<meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}">`;
}

export function omittedVendorFile(relativePath) {
  const normalized = String(relativePath).split('\\').join('/');
  return normalized === 'original/shared/eventLog_4_2_0.js' || normalized.endsWith('/eventLog_4_2_0.js');
}

export function omittedRemoteAsset(url) {
  try {
    return decodeURIComponent(new URL(url).pathname).endsWith('/eventLog_4_2_0.js');
  } catch {
    return false;
  }
}
