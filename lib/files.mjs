import { readdir } from 'node:fs/promises';
import path from 'node:path';

const textExtensions = new Set(['.js', '.css', '.html', '.svg', '.json', '.mjs']);
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

export async function walkFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walkFiles(fullPath));
    else if (entry.isFile() && entry.name !== '.DS_Store') files.push(fullPath);
  }
  return files;
}

export function relativePosix(root, fullPath) {
  return path.relative(root, fullPath).split(path.sep).join('/');
}

export function contentType(filePath) {
  return contentTypes[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

export function isTextFile(filePath) {
  return textExtensions.has(path.extname(filePath).toLowerCase());
}
