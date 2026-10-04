import { createHash } from 'node:crypto';
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ORIGINAL_RELEASE } from './utils.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vendorDirectory = path.join(root, 'vendor');
const originalDirectory = path.join(vendorDirectory, 'original');
const sdkRoot = path.join(vendorDirectory, 'hg-web-sdk');
const sdkDirectory = path.join(sdkRoot, '3.0.3');
const sdkVersion = '3.0.3';
const sdkBaseUrl = `https://web.hycdn.cn/hg_web_sdk/lib/${sdkVersion}/`;
const snapshotPath = path.join(vendorDirectory, 'snapshot.json');

const sourceUrls = new Map();

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureOriginal() {
  if (!(await exists(originalDirectory))) {
    throw new Error('vendor/original is missing.');
  }
}

function discoverSdkFiles(source) {
  const files = new Set();
  for (const match of source.matchAll(/return [A-Za-z]\+"\."\+(\{[^}]+\})\[[A-Za-z]\]\+"\.js"/g)) {
    for (const pair of match[1].matchAll(/(\d+):"([a-f0-9]+)"/g)) {
      files.add(`${pair[1]}.${pair[2]}.js`);
    }
  }
  for (const asset of source.matchAll(/assets\/[A-Za-z0-9_@.-]+\.(?:png|jpe?g|gif|webp|svg|css|js|json|woff2?|ttf)/g)) {
    files.add(asset[0]);
  }
  return files;
}

function discoverRemoteAssets(source) {
  const urls = [];
  for (const match of source.matchAll(/https?:\/\/[^"'\\\s)<>]+/g)) {
    const url = match[0].replace(/[),.;]+$/, '');
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      continue;
    }
    if (!(parsed.hostname.endsWith('hycdn.cn') || parsed.hostname.endsWith('hg-cdn.com'))) {
      continue;
    }
    if (url.startsWith(sdkBaseUrl) || parsed.pathname.endsWith('/')) {
      continue;
    }
    urls.push(url);
  }
  return urls;
}

async function download(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'orbipom-offline-vendor' } });
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function ensureSdk() {
  await mkdir(sdkDirectory, { recursive: true });
  const pending = [{ relativePath: `${sdkVersion}/hg-web-sdk.min.js`, url: `${sdkBaseUrl}hg-web-sdk.min.js` }];
  const seen = new Set();
  while (pending.length) {
    const item = pending.pop();
    if (seen.has(item.relativePath)) {
      continue;
    }
    seen.add(item.relativePath);
    const destination = path.join(sdkRoot, item.relativePath);
    sourceUrls.set(path.posix.join('hg-web-sdk', item.relativePath), item.url);
    if (!(await exists(destination))) {
      const bytes = await download(item.url);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, bytes);
    }
    if (!item.relativePath.endsWith('.js')) {
      continue;
    }
    const source = await readFile(destination, 'utf8');
    if (item.relativePath.endsWith('hg-web-sdk.min.js') && !source.includes(`lib/${sdkVersion}/`)) {
      throw new Error(`Downloaded SDK is not hg-web-sdk@${sdkVersion}.`);
    }
    for (const dependency of discoverSdkFiles(source)) {
      const relativePath = `${sdkVersion}/${dependency}`;
      if (!seen.has(relativePath)) {
        pending.push({ relativePath, url: `${sdkBaseUrl}${dependency}` });
      }
    }
    for (const remoteUrl of discoverRemoteAssets(source)) {
      const parsed = new URL(remoteUrl);
      if (parsed.search) {
        throw new Error(`Remote asset URL includes a query string: ${remoteUrl}`);
      }
      const relativePath = path.posix.join('remote', parsed.hostname, decodeURIComponent(parsed.pathname.slice(1)));
      if (!seen.has(relativePath)) {
        pending.push({ relativePath, url: remoteUrl });
      }
    }
  }
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
    } else if (entry.isFile() && entry.name !== 'snapshot.json') {
      files.push(fullPath);
    }
  }
  return files;
}

async function writeSnapshot() {
  const previous = await exists(snapshotPath) ? JSON.parse(await readFile(snapshotPath, 'utf8')) : null;
  for (const file of previous?.files ?? []) {
    if (file.sourceUrl && !sourceUrls.has(file.path)) {
      sourceUrls.set(file.path, file.sourceUrl);
    }
  }
  sourceUrls.set('hg-web-sdk/sdk.entry.js', null);
  const files = [];
  for (const fullPath of await walk(vendorDirectory)) {
    const relativePath = path.relative(vendorDirectory, fullPath).split(path.sep).join('/');
    const bytes = await readFile(fullPath);
    files.push({
      path: relativePath,
      sourceUrl: sourceUrls.get(relativePath) ?? null,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex')
    });
  }
  files.sort((left, right) => left.path.localeCompare(right.path));
  const snapshot = {
    originalRelease: ORIGINAL_RELEASE,
    sdk: { name: 'hg-web-sdk', version: sdkVersion },
    files
  };
  await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`Snapshot ${ORIGINAL_RELEASE} + hg-web-sdk@${sdkVersion}: ${files.length} files.`);
}

await ensureOriginal();
await ensureSdk();
await writeSnapshot();
