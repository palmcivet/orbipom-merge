import { createHash } from 'node:crypto';
import { access, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  FETCH_USER_AGENT,
  ORIGINAL_RELEASE,
  SDK_NAME,
  SDK_VERSION,
  SHARED_FONT_BASE,
  omittedRemoteAsset,
  omittedVendorFile,
  originalRoot,
  sdkRoot,
  snapshotFile,
  vendorRoot
} from '../config.mjs';
import { relativePosix, walkFiles } from '../files.mjs';
import { discoverRemoteAssets, discoverSdkFiles } from './discover.mjs';

const sdkDirectory = path.join(sdkRoot, SDK_VERSION);
const sdkBaseUrl = `https://web.hycdn.cn/hg_web_sdk/lib/${SDK_VERSION}/`;

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function download(url) {
  const response = await fetch(url, { headers: { 'user-agent': FETCH_USER_AGENT } });
  if (!response.ok) throw new Error(`Failed to download ${url}: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function ensureSdk(sourceUrls) {
  await mkdir(sdkDirectory, { recursive: true });
  const pending = [{ relativePath: `${SDK_VERSION}/hg-web-sdk.min.js`, url: `${sdkBaseUrl}hg-web-sdk.min.js` }];
  const seen = new Set();
  while (pending.length) {
    const item = pending.pop();
    if (seen.has(item.relativePath)) continue;
    seen.add(item.relativePath);
    const destination = path.join(sdkRoot, item.relativePath);
    sourceUrls.set(path.posix.join('hg-web-sdk', item.relativePath), item.url);
    if (!(await exists(destination))) {
      const bytes = await download(item.url);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, bytes);
    }
    if (!item.relativePath.endsWith('.js')) continue;
    const source = await readFile(destination, 'utf8');
    if (item.relativePath.endsWith('hg-web-sdk.min.js') && !source.includes(`lib/${SDK_VERSION}/`)) {
      throw new Error(`Downloaded SDK is not ${SDK_NAME}@${SDK_VERSION}.`);
    }
    for (const dependency of discoverSdkFiles(source)) {
      const relativePath = `${SDK_VERSION}/${dependency}`;
      if (!seen.has(relativePath)) pending.push({ relativePath, url: `${sdkBaseUrl}${dependency}` });
    }
    for (const remoteUrl of discoverRemoteAssets(source, { sdkBaseUrl, omittedRemoteAsset })) {
      const parsed = new URL(remoteUrl);
      if (parsed.search) throw new Error(`Remote asset URL includes a query string: ${remoteUrl}`);
      const relativePath = path.posix.join('remote', parsed.hostname, decodeURIComponent(parsed.pathname.slice(1)));
      if (!seen.has(relativePath)) pending.push({ relativePath, url: remoteUrl });
    }
  }
}

async function writeSnapshot(sourceUrls) {
  const previous = await exists(snapshotFile) ? JSON.parse(await readFile(snapshotFile, 'utf8')) : null;
  for (const file of previous?.files ?? []) {
    if (file.sourceUrl && !sourceUrls.has(file.path)) sourceUrls.set(file.path, file.sourceUrl);
  }
  sourceUrls.set('hg-web-sdk/sdk.entry.js', null);
  const files = [];
  for (const fullPath of await walkFiles(vendorRoot)) {
    const relativePath = relativePosix(vendorRoot, fullPath);
    if (relativePath === 'snapshot.json') continue;
    if (omittedVendorFile(relativePath)) {
      await unlink(fullPath);
      continue;
    }
    if (relativePath.startsWith('original/shared/')) {
      sourceUrls.set(relativePath, `${SHARED_FONT_BASE}${relativePath.slice('original/shared/'.length)}`);
    }
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
    sdk: { name: SDK_NAME, version: SDK_VERSION },
    files
  };
  await writeFile(snapshotFile, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`Snapshot ${ORIGINAL_RELEASE} + ${SDK_NAME}@${SDK_VERSION}: ${files.length} files.`);
}

export async function updateSnapshot() {
  try {
    await access(originalRoot);
  } catch {
    throw new Error('vendor/original is missing.');
  }
  const sourceUrls = new Map();
  await ensureSdk(sourceUrls);
  await writeSnapshot(sourceUrls);
}
