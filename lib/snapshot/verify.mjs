import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ORIGINAL_RELEASE, omittedVendorFile, snapshotFile, vendorRoot } from '../config.mjs';
import { relativePosix, walkFiles } from '../files.mjs';

export async function verifySnapshot() {
  const snapshot = JSON.parse(await readFile(snapshotFile, 'utf8'));
  if (snapshot.originalRelease !== ORIGINAL_RELEASE) {
    throw new Error(`Snapshot release ${snapshot.originalRelease} does not match ${ORIGINAL_RELEASE}.`);
  }
  const listed = new Set();
  for (const file of snapshot.files) {
    if (omittedVendorFile(file.path)) {
      throw new Error(`Snapshot still lists an omitted file: ${file.path}`);
    }
    listed.add(file.path);
    const fullPath = path.join(vendorRoot, file.path);
    const bytes = await readFile(fullPath);
    if (bytes.subarray(0, 40).toString().startsWith('version https://git-lfs.github.com/spec/v1')) {
      throw new Error(`${file.path} is a Git LFS pointer. Install Git LFS and pull the objects before building.`);
    }
    const hash = createHash('sha256').update(bytes).digest('hex');
    if (hash !== file.sha256 || bytes.length !== file.bytes) {
      throw new Error(`Snapshot hash mismatch: ${file.path}`);
    }
  }
  const found = await walkFiles(vendorRoot);
  for (const fullPath of found) {
    const relativePath = relativePosix(vendorRoot, fullPath);
    if (relativePath === 'snapshot.json' || omittedVendorFile(relativePath)) continue;
    if (!listed.has(relativePath)) throw new Error(`Unlisted vendor file: ${relativePath}`);
  }
  const tracked = found.filter(fullPath => {
    const relativePath = relativePosix(vendorRoot, fullPath);
    return relativePath !== 'snapshot.json' && !omittedVendorFile(relativePath);
  });
  if (tracked.length !== snapshot.files.length) {
    throw new Error('Snapshot file list does not match vendor/.');
  }
  return snapshot;
}
