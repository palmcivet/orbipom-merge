import path from 'node:path';
import { omittedVendorFile, originalRoot, sdkRoot, siteUrl } from '../config.mjs';

const mounts = [
  { prefix: '/site/', directory: originalRoot, fromOriginal: true },
  { prefix: '/shared/', directory: originalRoot, fromOriginal: true },
  { prefix: '/vendor/hg-web-sdk/', directory: sdkRoot, fromOriginal: false }
];

export function publicPath(vendorPath) {
  if (vendorPath.startsWith('original/')) return `/${vendorPath.slice('original/'.length)}`;
  if (vendorPath.startsWith('hg-web-sdk/')) return `/vendor/${vendorPath}`;
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
    remoteReplacements(basePath) {
      return snapshot.files
        .filter(file => file.sourceUrl && file.path.startsWith('hg-web-sdk/remote/'))
        .map(file => [file.sourceUrl, siteUrl(basePath, publicPath(file.path))]);
    },
    resolve(urlPath) {
      if (urlPath === '/play/game.html') return { type: 'play' };
      for (const mount of mounts) {
        if (!urlPath.startsWith(mount.prefix)) continue;
        const relativePath = urlPath.slice(mount.prefix.length);
        if (relativePath.includes('\0')) return { type: 'missing' };
        const absolutePath = path.resolve(mount.directory, mount.fromOriginal ? `${mount.prefix.slice(1)}${relativePath}` : relativePath);
        if (!inside(mount.directory, absolutePath)) return { type: 'missing' };
        const vendorPath = mount.fromOriginal
          ? `original/${path.relative(originalRoot, absolutePath).split(path.sep).join('/')}`
          : `hg-web-sdk/${relativePath}`;
        if (omittedVendorFile(vendorPath)) return { type: 'missing' };
        return { type: 'file', absolutePath, vendorPath };
      }
      return null;
    }
  };
}
