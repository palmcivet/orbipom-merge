import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { cp, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ORIGINAL_RELEASE, omittedVendorFile, siteUrl } from './site.mjs';
import {
  adaptChineseLocale,
  adaptEntryBundle,
  adaptGameBundle,
  adaptHtml,
  rewriteAssetUrls
} from './utils.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vendorDirectory = path.join(root, 'vendor');
const originalDirectory = path.join(vendorDirectory, 'original');
const sdkDirectory = path.join(vendorDirectory, 'hg-web-sdk');
export const textExtensions = new Set(['.js', '.css', '.html', '.svg', '.json', '.mjs']);
const contentTypes = {
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf'
};

function transformOriginal(relativePath, source, basePath, extraReplacements) {
  if (relativePath === 'site/821.67c1cf.js') {
    return adaptGameBundle(source, basePath, extraReplacements);
  }
  if (relativePath === 'site/index.3d8293.js') {
    return adaptEntryBundle(source, basePath, extraReplacements);
  }
  if (relativePath === 'site/965.fc780b.js') {
    return adaptChineseLocale(source, basePath, extraReplacements);
  }
  return rewriteAssetUrls(source, basePath, extraReplacements);
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
    } else if (entry.isFile() && entry.name !== '.DS_Store') {
      files.push(fullPath);
    }
  }
  return files;
}

export async function verifySnapshot() {
  const snapshot = JSON.parse(await readFile(path.join(vendorDirectory, 'snapshot.json'), 'utf8'));
  if (snapshot.originalRelease !== ORIGINAL_RELEASE) {
    throw new Error(`Snapshot release ${snapshot.originalRelease} does not match ${ORIGINAL_RELEASE}.`);
  }
  if (snapshot.sdk?.name !== 'hg-web-sdk' || snapshot.sdk.version !== '3.0.3') {
    throw new Error('Snapshot SDK is not hg-web-sdk@3.0.3.');
  }
  const listed = new Set();
  for (const file of snapshot.files) {
    if (omittedVendorFile(file.path)) {
      throw new Error(`Snapshot still lists an omitted file: ${file.path}`);
    }
    listed.add(file.path);
    const fullPath = path.join(vendorDirectory, file.path);
    const bytes = await readFile(fullPath);
    if (bytes.subarray(0, 40).toString().startsWith('version https://git-lfs.github.com/spec/v1')) {
      throw new Error(`${file.path} is a Git LFS pointer. Install Git LFS and pull the objects before building.`);
    }
    const hash = createHash('sha256').update(bytes).digest('hex');
    if (hash !== file.sha256 || bytes.length !== file.bytes) {
      throw new Error(`Snapshot hash mismatch: ${file.path}`);
    }
  }
  const found = await walk(vendorDirectory);
  for (const fullPath of found) {
    const relativePath = path.relative(vendorDirectory, fullPath).split(path.sep).join('/');
    if (relativePath === 'snapshot.json' || omittedVendorFile(relativePath)) {
      continue;
    }
    if (!listed.has(relativePath)) {
      throw new Error(`Unlisted vendor file: ${relativePath}`);
    }
  }
  const tracked = found.filter(fullPath => {
    const relativePath = path.relative(vendorDirectory, fullPath).split(path.sep).join('/');
    return relativePath !== 'snapshot.json' && !omittedVendorFile(relativePath);
  });
  if (tracked.length !== snapshot.files.length) {
    throw new Error('Snapshot file list does not match vendor/.');
  }
  return snapshot;
}

export function extraReplacementsFor(snapshot, basePath) {
  return snapshot.files
    .filter(file => file.sourceUrl && file.path.startsWith('hg-web-sdk/remote/'))
    .map(file => [file.sourceUrl, siteUrl(basePath, `/vendor/${file.path}`)]);
}

async function emitFile(fullPath, destination, transform) {
  await mkdir(path.dirname(destination), { recursive: true });
  const extension = path.extname(fullPath).toLowerCase();
  if (!textExtensions.has(extension)) {
    await cp(fullPath, destination);
    return;
  }
  const source = await readFile(fullPath, 'utf8');
  await writeFile(destination, transform(source));
}

export async function emitVendor(distDirectory, basePath, extraReplacements, assets) {
  for (const fullPath of await walk(originalDirectory)) {
    const relativePath = path.relative(originalDirectory, fullPath).split(path.sep).join('/');
    if (relativePath === 'official-index.html' || omittedVendorFile(`original/${relativePath}`)) {
      continue;
    }
    await emitFile(fullPath, path.join(distDirectory, relativePath), source => transformOriginal(relativePath, source, basePath, extraReplacements));
  }
  for (const fullPath of await walk(sdkDirectory)) {
    const relativePath = path.relative(sdkDirectory, fullPath).split(path.sep).join('/');
    if (omittedVendorFile(`hg-web-sdk/${relativePath}`)) {
      continue;
    }
    await emitFile(fullPath, path.join(distDirectory, 'vendor', 'hg-web-sdk', relativePath), source => rewriteAssetUrls(source, basePath, extraReplacements));
  }
  const playDirectory = path.join(distDirectory, 'play');
  await mkdir(playDirectory, { recursive: true });
  await writeFile(path.join(playDirectory, 'game.html'), await renderPlayHtml(basePath, extraReplacements, assets));
}

export async function renderPlayHtml(basePath, extraReplacements, assets) {
  const originalHtml = await readFile(path.join(originalDirectory, 'official-index.html'), 'utf8');
  return adaptHtml(originalHtml, basePath, extraReplacements, assets);
}

function assertNoRemoteAssets(relativePath, source) {
  const urls = source.match(/https?:\/\/[^"'\\\s)<>]+/g) ?? [];
  const offenders = [];
  for (const rawUrl of urls) {
    const url = rawUrl.replace(/[),.;]+$/, '');
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      continue;
    }
    const host = parsed.hostname;
    const assetHost = host === 'web.hycdn.cn' || host === 'web-static.hg-cdn.com' || host.endsWith('.hycdn.cn') || host.endsWith('.hg-cdn.com');
    const hypergryphAsset = /(^|\.)hypergryph\.(com|net)$|(^|\.)gryphline\.(com|net)$/.test(host)
      && (/\.(?:js|mjs|css|png|jpe?g|gif|webp|svg|ico|mp3|woff2?|ttf|otf)$/i.test(parsed.pathname)
        || parsed.pathname.includes('/hg_web_sdk/')
        || parsed.pathname.includes('/static/js/')
        || parsed.pathname.includes('/webview/static/'));
    if (assetHost || hypergryphAsset) {
      offenders.push(url);
    }
  }
  if (offenders.length) {
    throw new Error(`Remote asset URL remains in ${relativePath}: ${offenders.slice(0, 5).join(', ')}`);
  }
}

export async function scanDist(distDirectory) {
  for (const fullPath of await walk(distDirectory)) {
    const extension = path.extname(fullPath).toLowerCase();
    if (!textExtensions.has(extension)) {
      continue;
    }
    const relativePath = path.relative(distDirectory, fullPath);
    if (path.basename(fullPath) === 'sw.js') {
      continue;
    }
    const source = await readFile(fullPath, 'utf8');
    if (source.includes('%%BASE%%') || source.includes('%%BASE_JSON%%') || source.includes('%BASE_URL%')) {
      throw new Error(`Unreplaced base token in ${relativePath}`);
    }
    assertNoRemoteAssets(relativePath, source);
  }
}

function contentType(filePath) {
  return contentTypes[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

function inside(rootDirectory, fullPath) {
  const relative = path.relative(rootDirectory, fullPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function locate(urlPath) {
  if (urlPath === '/play/game.html') {
    return { kind: 'play' };
  }
  if (urlPath === '/shared/eventLog_4_2_0.js') {
    return { kind: 'missing' };
  }
  const routes = [
    ['/site/', originalDirectory, true],
    ['/shared/', originalDirectory, true],
    ['/vendor/hg-web-sdk/', sdkDirectory, false]
  ];
  for (const [prefix, directory, fromOriginal] of routes) {
    if (!urlPath.startsWith(prefix)) {
      continue;
    }
    const relativePath = urlPath.slice(prefix.length);
    if (relativePath.includes('\0')) {
      return { kind: 'missing' };
    }
    const fullPath = path.resolve(directory, fromOriginal ? `${prefix.slice(1)}${relativePath}` : relativePath);
    if (!inside(directory, fullPath)) {
      return { kind: 'missing' };
    }
    const originalRelative = fromOriginal
      ? path.relative(originalDirectory, fullPath).split(path.sep).join('/')
      : null;
    const vendorRelative = fromOriginal ? `original/${originalRelative}` : `hg-web-sdk/${relativePath}`;
    if (omittedVendorFile(vendorRelative)) {
      return { kind: 'missing' };
    }
    return { kind: 'file', fullPath, originalRelative, rewriteOnly: !fromOriginal };
  }
  return null;
}

function sendBuffer(req, res, body, type, headers = {}) {
  res.statusCode = 200;
  res.setHeader('Content-Type', type);
  res.setHeader('Content-Length', body.length);
  for (const [name, value] of Object.entries(headers)) {
    res.setHeader(name, value);
  }
  res.end(req.method === 'HEAD' ? undefined : body);
}

async function sendFile(req, res, fullPath) {
  const info = await stat(fullPath);
  if (!info.isFile()) {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', contentType(fullPath));
  const range = req.headers.range;
  let start = 0;
  let end = info.size - 1;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (match[1] === '' && match[2] === '')) {
      res.statusCode = 416;
      res.setHeader('Content-Range', `bytes */${info.size}`);
      res.end();
      return;
    }
    if (match[1] === '') {
      start = Math.max(0, info.size - Number(match[2]));
    } else {
      start = Number(match[1]);
      end = match[2] === '' ? info.size - 1 : Number(match[2]);
    }
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= info.size) {
      res.statusCode = 416;
      res.setHeader('Content-Range', `bytes */${info.size}`);
      res.end();
      return;
    }
    end = Math.min(end, info.size - 1);
    res.statusCode = 206;
    res.setHeader('Content-Range', `bytes ${start}-${end}/${info.size}`);
  }
  res.setHeader('Content-Length', end - start + 1);
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  createReadStream(fullPath, { start, end }).pipe(res);
}

export function createVendorMiddleware({ base, basePath, extraReplacements, playAssets, files = {}, dynamic = {} }) {
  const cache = new Map();
  return async function vendorMiddleware(req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }
    let urlPath;
    try {
      urlPath = decodeURIComponent(req.url.split('?')[0]);
    } catch {
      res.statusCode = 400;
      res.end('Bad request');
      return;
    }
    if (base !== '/' && (urlPath === base.slice(0, -1) || urlPath.startsWith(base))) {
      urlPath = urlPath.slice(base.length - 1) || '/';
    }
    if (files[urlPath]) {
      sendBuffer(req, res, await readFile(files[urlPath]), contentType(files[urlPath]));
      return;
    }
    if (dynamic[urlPath]) {
      const headers = {};
      if (urlPath === '/sw.js') headers['Cache-Control'] = 'no-cache';
      const type = urlPath === '/manifest.json' ? 'application/manifest+json; charset=utf-8' : contentType(urlPath);
      sendBuffer(req, res, Buffer.from(await dynamic[urlPath]()), type, headers);
      return;
    }
    const located = locate(urlPath);
    if (!located) {
      next();
      return;
    }
    if (located.kind === 'missing') {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    if (located.kind === 'play') {
      sendBuffer(req, res, Buffer.from(await renderPlayHtml(basePath, extraReplacements, playAssets)), 'text/html; charset=utf-8');
      return;
    }
    let info;
    try {
      info = await stat(located.fullPath);
    } catch {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    if (!info.isFile()) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    const extension = path.extname(located.fullPath).toLowerCase();
    if (!textExtensions.has(extension)) {
      await sendFile(req, res, located.fullPath);
      return;
    }
    const cacheKey = `${located.fullPath}:${info.mtimeMs}:${info.size}`;
    let body = cache.get(cacheKey);
    if (!body) {
      const source = await readFile(located.fullPath, 'utf8');
      const transformed = located.rewriteOnly
        ? rewriteAssetUrls(source, basePath, extraReplacements)
        : transformOriginal(located.originalRelative, source, basePath, extraReplacements);
      body = Buffer.from(transformed);
      cache.set(cacheKey, body);
    }
    sendBuffer(req, res, body, contentType(located.fullPath));
  };
}
