import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const repoRoot = path.resolve(here, '..');
export const sourceRoot = path.join(repoRoot, 'src');
export const vendorRoot = path.join(repoRoot, 'vendor');
export const originalRoot = path.join(vendorRoot, 'original');
export const snapshotFile = path.join(vendorRoot, 'snapshot.json');
export const cdnManifestFile = path.join(repoRoot, 'lib/generated/cdn-manifest.js');
export const telemetryStubFile = path.join(sourceRoot, 'offline/no-telemetry.js');
export const officialHtmlFile = path.join(originalRoot, 'official-index.html');

export const ORIGINAL_RELEASE = 'v1d5-synthesize-tuantuan-web@1.1.2';

export const CONTENT_SECURITY_POLICY = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'";

export const ORIGINAL_ASSET_BASE = 'https://web.hycdn.cn/endfield/webview/unn3irGqmsvyaKnFbTug/act/orbipom-merge-XaVa5Tz/';
export const SHARED_FONT_BASE = 'https://web.hycdn.cn/webview/static/fonts/';
export const BLOCKED_API_ORIGIN = 'https://ef-webview.hypergryph.com/act-server/orbipom-merge';
export const PROBE_URL = 'https://web.hycdn.cn/endfield/webview/unn3irGqmsvyaKnFbTug/act/orbipom-merge-XaVa5Tz/favicon-hg.ico';

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
  PATCH_TARGETS.locale
]);

export const CDN_ASSET = /\.(?:png|jpe?g|gif|webp|svg|ico|mp3|wav|ogg|woff2?|ttf|otf)$/i;

export const PUBLIC_PATHS = {
  telemetryStub: '/offline/no-telemetry.js',
  runtimeScript: '/offline/index.js',
  blockedApi: '/offline/blocked-original-api',
  playGame: '/play/game.html',
  ogImage: '/og.webp'
};

export const ogImageFile = path.join(repoRoot, 'assets/bg.webp');
export const OG_IMAGE_WIDTH = 1600;
export const OG_IMAGE_HEIGHT = 900;
export const OG_TITLE = '融合！山团团！';
export const OG_DESCRIPTION = '《明日方舟：终末地》「融合！山团团！」本地离线版。';

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

export function openGraphImageUrl(basePath) {
  const site = (process.env.ORBIPOM_SITE_URL ?? '').trim().replace(/\/+$/, '');
  if (site) return `${site}${PUBLIC_PATHS.ogImage}`;
  return siteUrl(basePath, PUBLIC_PATHS.ogImage);
}

export function openGraphMeta(basePath) {
  const image = openGraphImageUrl(basePath);
  return [
    `<meta name="description" content="${OG_DESCRIPTION}">`,
    `<meta property="og:title" content="${OG_TITLE}">`,
    `<meta property="og:description" content="${OG_DESCRIPTION}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:image" content="${image}">`,
    `<meta property="og:image:type" content="image/webp">`,
    `<meta property="og:image:width" content="${OG_IMAGE_WIDTH}">`,
    `<meta property="og:image:height" content="${OG_IMAGE_HEIGHT}">`,
    `<meta property="og:image:alt" content="${OG_TITLE}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:image" content="${image}">`
  ].join('');
}

export function omittedVendorFile(relativePath) {
  const normalized = String(relativePath).split('\\').join('/');
  return normalized === 'original/shared/eventLog_4_2_0.js' || normalized.endsWith('/eventLog_4_2_0.js');
}
