import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  adaptChineseLocale,
  adaptEntryBundle,
  adaptGameBundle,
  adaptHtml,
  cspMeta,
  normalizeBase,
  ORIGINAL_RELEASE,
  rewriteAssetUrls,
  siteUrl
} from './utils.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vendorDirectory = path.join(root, 'vendor');
const distDirectory = path.join(root, 'dist');
const basePath = process.env.ORBIPOM_BASE_PATH ?? '/';
const base = normalizeBase(basePath);
const textExtensions = new Set(['.js', '.css', '.html', '.svg', '.json', '.mjs']);
const omittedFromDist = new Set(['original/shared/eventLog_4_2_0.js']);
let extraReplacements = [];

function transformOriginal(relativePath, source) {
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

async function verifySnapshot() {
  const snapshot = JSON.parse(await readFile(path.join(vendorDirectory, 'snapshot.json'), 'utf8'));
  if (snapshot.originalRelease !== ORIGINAL_RELEASE) {
    throw new Error(`Snapshot release ${snapshot.originalRelease} does not match ${ORIGINAL_RELEASE}.`);
  }
  if (snapshot.sdk?.name !== 'hg-web-sdk' || snapshot.sdk.version !== '3.0.3') {
    throw new Error('Snapshot SDK is not hg-web-sdk@3.0.3.');
  }
  const listed = new Set();
  for (const file of snapshot.files) {
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
    if (relativePath === 'snapshot.json') {
      continue;
    }
    if (!listed.has(relativePath)) {
      throw new Error(`Unlisted vendor file: ${relativePath}`);
    }
  }
  if (found.filter(fullPath => path.basename(fullPath) !== 'snapshot.json').length !== snapshot.files.length) {
    throw new Error('Snapshot file list does not match vendor/.');
  }
  return snapshot;
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

async function emitFile(fullPath, relativePath, destination, transform) {
  await mkdir(path.dirname(destination), { recursive: true });
  const extension = path.extname(fullPath).toLowerCase();
  if (!textExtensions.has(extension)) {
    await cp(fullPath, destination);
    return;
  }
  const source = await readFile(fullPath, 'utf8');
  await writeFile(destination, transform(source, relativePath));
}

async function emitOriginal() {
  const sourceRoot = path.join(vendorDirectory, 'original');
  for (const fullPath of await walk(sourceRoot)) {
    const relativePath = path.relative(sourceRoot, fullPath).split(path.sep).join('/');
    if (relativePath === 'official-index.html' || omittedFromDist.has(`original/${relativePath}`)) {
      continue;
    }
    await emitFile(fullPath, relativePath, path.join(distDirectory, relativePath), (source, filePath) => transformOriginal(filePath, source));
  }
}

async function emitSdk() {
  const sourceRoot = path.join(vendorDirectory, 'hg-web-sdk');
  for (const fullPath of await walk(sourceRoot)) {
    const relativePath = path.relative(sourceRoot, fullPath).split(path.sep).join('/');
    await emitFile(fullPath, relativePath, path.join(distDirectory, 'vendor', 'hg-web-sdk', relativePath), source => rewriteAssetUrls(source, basePath, extraReplacements));
  }
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

async function scanDist() {
  for (const fullPath of await walk(distDirectory)) {
    const extension = path.extname(fullPath).toLowerCase();
    if (!textExtensions.has(extension)) {
      continue;
    }
    const relativePath = path.relative(distDirectory, fullPath);
    const source = await readFile(fullPath, 'utf8');
    if (source.includes('%%BASE%%') || source.includes('%%BASE_JSON%%')) {
      throw new Error(`Unreplaced base token in ${relativePath}`);
    }
    assertNoRemoteAssets(relativePath, source);
  }
}

const snapshot = await verifySnapshot();
extraReplacements = snapshot.files
  .filter(file => file.sourceUrl && file.path.startsWith('hg-web-sdk/remote/'))
  .map(file => [file.sourceUrl, siteUrl(basePath, `/vendor/${file.path}`)]);
await rm(distDirectory, { recursive: true, force: true });
await mkdir(distDirectory, { recursive: true });

const originalHtml = await readFile(path.join(vendorDirectory, 'original', 'official-index.html'), 'utf8');
await mkdir(path.join(distDirectory, 'play'), { recursive: true });
await writeFile(path.join(distDirectory, 'play', 'index.html'), adaptHtml(originalHtml, basePath, extraReplacements));

await emitOriginal();
await emitSdk();

let home = await readFile(path.join(root, 'src', 'index.html'), 'utf8');
home = home.replaceAll('%%BASE_JSON%%', JSON.stringify(base));
home = home.replaceAll('%%BASE%%', base);
home = home.replace('<head>', `<head>${cspMeta()}`);
await writeFile(path.join(distDirectory, 'index.html'), home);
await mkdir(path.join(distDirectory, 'offline'), { recursive: true });
await cp(path.join(root, 'src', 'adapter.js'), path.join(distDirectory, 'offline', 'adapter.js'));
await cp(path.join(root, 'src', 'offline.css'), path.join(distDirectory, 'offline', 'offline.css'));
await cp(path.join(root, 'src', 'no-telemetry.js'), path.join(distDirectory, 'offline', 'no-telemetry.js'));

await scanDist();
console.log(`Built ${ORIGINAL_RELEASE} with base ${base || '/'}.`);
