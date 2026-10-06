import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { PUBLIC_PATHS, officialHtmlFile, ogImageFile, telemetryStubFile } from '../config.mjs';
import { contentType, isTextFile } from '../files.mjs';
import { renderPlayDocument, transformVendorSource } from './transform/pipeline.mjs';

function stripBase(urlPath, base) {
  if (base !== '/' && (urlPath === base.slice(0, -1) || urlPath.startsWith(base))) {
    return urlPath.slice(base.length - 1) || '/';
  }
  return urlPath;
}

function sendBuffer(req, res, body, type) {
  res.statusCode = 200;
  res.setHeader('Content-Type', type);
  res.setHeader('Content-Length', body.length);
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

export function createDevMiddleware({ base, catalog, getContext }) {
  const cache = new Map();
  return async function devMiddleware(req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }
    let urlPath;
    try {
      urlPath = stripBase(decodeURIComponent(req.url.split('?')[0]), base);
    } catch {
      res.statusCode = 400;
      res.end('Bad request');
      return;
    }
    if (urlPath === PUBLIC_PATHS.telemetryStub) {
      sendBuffer(req, res, await readFile(telemetryStubFile), contentType(telemetryStubFile));
      return;
    }
    if (urlPath === PUBLIC_PATHS.ogImage) {
      await sendFile(req, res, ogImageFile);
      return;
    }
    const located = catalog.resolve(urlPath);
    if (!located) {
      next();
      return;
    }
    if (located.type === 'missing') {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    const context = await getContext();
    if (located.type === 'play') {
      const originalHtml = await readFile(officialHtmlFile, 'utf8');
      sendBuffer(req, res, Buffer.from(renderPlayDocument(originalHtml, context)), 'text/html; charset=utf-8');
      return;
    }
    let info;
    try {
      info = await stat(located.absolutePath);
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
    if (!isTextFile(located.absolutePath)) {
      await sendFile(req, res, located.absolutePath);
      return;
    }
    const cacheKey = `${located.absolutePath}:${info.mtimeMs}:${info.size}`;
    let body = cache.get(cacheKey);
    if (!body) {
      const source = await readFile(located.absolutePath, 'utf8');
      body = Buffer.from(transformVendorSource(located.vendorPath, source, context));
      cache.set(cacheKey, body);
    }
    sendBuffer(req, res, body, contentType(located.absolutePath));
  };
}
