import { createHash } from 'node:crypto';
import { access, readFile, unlink, writeFile } from 'node:fs/promises';
import {
  ORIGINAL_RELEASE,
  SHARED_FONT_BASE,
  omittedVendorFile,
  originalRoot,
  snapshotFile,
  vendorRoot
} from '../config.mjs';
import { relativePosix, walkFiles } from '../files.mjs';

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeSnapshot() {
  const previous = await exists(snapshotFile) ? JSON.parse(await readFile(snapshotFile, 'utf8')) : null;
  const sourceUrls = new Map();
  for (const file of previous?.files ?? []) {
    if (file.sourceUrl) sourceUrls.set(file.path, file.sourceUrl);
  }
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
    files
  };
  await writeFile(snapshotFile, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`Snapshot ${ORIGINAL_RELEASE}: ${files.length} files.`);
}

export async function updateSnapshot() {
  try {
    await access(originalRoot);
  } catch {
    throw new Error('vendor/original is missing.');
  }
  await writeSnapshot();
}
