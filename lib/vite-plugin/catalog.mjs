import path from 'node:path';
import { omittedVendorFile, originalRoot } from '../config.mjs';

const mounts = [
  { prefix: '/site/', directory: originalRoot },
  { prefix: '/shared/', directory: originalRoot }
];

export function publicPath(vendorPath) {
  if (vendorPath.startsWith('original/')) return `/${vendorPath.slice('original/'.length)}`;
  throw new Error(`No site path for ${vendorPath}`);
}

export function outputRelative(vendorPath) {
  return publicPath(vendorPath).slice(1);
}

function inside(rootDirectory, fullPath) {
  const relative = path.relative(rootDirectory, fullPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function createCatalog(snapshot) {
  return {
    snapshot,
    files: snapshot.files,
    resolve(urlPath) {
      if (urlPath === '/play/game.html') return { type: 'play' };
      for (const mount of mounts) {
        if (!urlPath.startsWith(mount.prefix)) continue;
        const relativePath = urlPath.slice(mount.prefix.length);
        if (relativePath.includes('\0')) return { type: 'missing' };
        const absolutePath = path.resolve(mount.directory, `${mount.prefix.slice(1)}${relativePath}`);
        if (!inside(mount.directory, absolutePath)) return { type: 'missing' };
        const vendorPath = `original/${path.relative(originalRoot, absolutePath).split(path.sep).join('/')}`;
        if (omittedVendorFile(vendorPath)) return { type: 'missing' };
        return { type: 'file', absolutePath, vendorPath };
      }
      return null;
    }
  };
}
