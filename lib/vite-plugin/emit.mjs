import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { officialHtmlFile, omittedVendorFile, vendorRoot } from '../config.mjs';
import { isTextFile, relativePosix, walkFiles } from '../files.mjs';
import { renderPlayDocument, transformVendorSource } from './transform/pipeline.mjs';
import { outputRelative } from './catalog.mjs';

const REMOTE_URL = /https?:\/\/[^"'\\\s)<>]+/g;
const PUBLISHER_HOST = /(^|\.)hypergryph\.(com|net)$|(^|\.)gryphline\.(com|net)$/;
const PUBLISHER_ASSET = /\.(?:js|mjs|css|png|jpe?g|gif|webp|svg|ico|mp3|woff2?|ttf|otf)$/i;

async function emitOne(vendorPath, absolutePath, destination, context) {
  await mkdir(path.dirname(destination), { recursive: true });
  if (!isTextFile(absolutePath)) {
    await cp(absolutePath, destination);
    return;
  }
  const source = await readFile(absolutePath, 'utf8');
  await writeFile(destination, transformVendorSource(vendorPath, source, context));
}

export async function emitRelease({ outDir, catalog, context }) {
  for (const file of catalog.files) {
    if (omittedVendorFile(file.path) || file.path === 'original/official-index.html') continue;
    await emitOne(file.path, path.join(vendorRoot, file.path), path.join(outDir, outputRelative(file.path)), context);
  }
  const playDirectory = path.join(outDir, 'play');
  await mkdir(playDirectory, { recursive: true });
  const originalHtml = await readFile(officialHtmlFile, 'utf8');
  await writeFile(path.join(playDirectory, 'game.html'), renderPlayDocument(originalHtml, context));
}

function isAssetHost(host) {
  return host === 'web.hycdn.cn' || host === 'web-static.hg-cdn.com' || host.endsWith('.hycdn.cn') || host.endsWith('.hg-cdn.com');
}

function isRemoteAsset(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  const publisherAsset = PUBLISHER_HOST.test(parsed.hostname) && (
    PUBLISHER_ASSET.test(parsed.pathname)
    || parsed.pathname.includes('/hg_web_sdk/')
    || parsed.pathname.includes('/static/js/')
    || parsed.pathname.includes('/webview/static/')
  );
  return isAssetHost(parsed.hostname) || publisherAsset;
}

function assertNoRemoteAssets(relativePath, source) {
  const offenders = [];
  for (const rawUrl of source.match(REMOTE_URL) ?? []) {
    const url = rawUrl.replace(/[),.;]+$/, '');
    if (isRemoteAsset(url)) offenders.push(url);
  }
  if (offenders.length) {
    throw new Error(`Remote asset URL remains in ${relativePath}: ${offenders.slice(0, 5).join(', ')}`);
  }
}

export async function scanDist(distDirectory) {
  for (const fullPath of await walkFiles(distDirectory)) {
    if (!isTextFile(fullPath) || path.basename(fullPath) === 'sw.js') continue;
    const relativePath = relativePosix(distDirectory, fullPath);
    const source = await readFile(fullPath, 'utf8');
    if (source.includes('%%BASE%%') || source.includes('%%BASE_JSON%%') || source.includes('%BASE_URL%')) {
      throw new Error(`Unreplaced base token in ${relativePath}`);
    }
    assertNoRemoteAssets(relativePath, source);
  }
}
