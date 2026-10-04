import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { writeCdnMap } from './cdn-fallback.mjs';
import { ORIGINAL_RELEASE, cspMeta, siteUrl } from './site.mjs';
import {
  createVendorMiddleware,
  emitVendor,
  extraReplacementsFor,
  scanDist,
  verifySnapshot
} from './vendor.mjs';

const telemetrySources = [
  'https://web.hycdn.cn/webview/static/scripts/eventLog_4_2_0.js',
  'https://web-static.hg-cdn.com/webview/static/scripts/eventLog_4_2_0.js'
];

export function orbipom({ basePath }) {
  let command = 'serve';
  let outDir = '';
  let siteBase = '/';
  let sourceRoot = '';
  let release = null;
  let releaseTask = null;
  let builtAssets = null;
  let emitted = false;

  function telemetryFile() {
    return path.join(sourceRoot, 'adapter', 'no-telemetry.js');
  }

  function linkedAssets(html) {
    const found = [];
    for (const tag of html.matchAll(/<link\b[^>]*>/g)) {
      if (!/\brel="stylesheet"/.test(tag[0])) continue;
      const href = tag[0].match(/\bhref="([^"]+)"/);
      if (href) found.push(href[1]);
    }
    for (const src of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)) {
      found.push(src[1]);
    }
    return found;
  }

  function playAssets() {
    return {
      adapterSrc: siteUrl(basePath, '/adapter/index.js'),
      styleSrc: siteUrl(basePath, '/adapter/index.css')
    };
  }

  function ensureRelease() {
    if (release) {
      return Promise.resolve(release);
    }
    if (!releaseTask) {
      releaseTask = verifySnapshot().then(async snapshot => {
        const stub = siteUrl(basePath, '/adapter/no-telemetry.js');
        await writeCdnMap(snapshot, basePath, path.resolve(sourceRoot, '../lib/generated/cdn-map.js'));
        release = {
          snapshot,
          extraReplacements: [
            ...telemetrySources.map(source => [source, stub]),
            ...extraReplacementsFor(snapshot, basePath)
          ]
        };
        return release;
      });
    }
    return releaseTask;
  }

  return {
    name: 'orbipom',
    enforce: 'post',
    configResolved(config) {
      command = config.command;
      outDir = config.build.outDir;
      siteBase = config.base;
      sourceRoot = config.root;
    },
    async buildStart() {
      await ensureRelease();
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replace('<head>', `<head>${cspMeta()}`);
      }
    },
    async generateBundle(_options, bundle) {
      if (command !== 'build') return;
      const htmlChunk = Object.values(bundle).find(item => item.type === 'asset' && item.fileName === 'index.html');
      if (!htmlChunk) return;
      const home = Buffer.from(htmlChunk.source).toString('utf8');
      const assets = linkedAssets(home);
      if (!assets.some(url => url.endsWith('.js')) || !assets.some(url => url.endsWith('.css'))) {
        throw new Error('Built homepage is missing the adapter module or stylesheet.');
      }
      builtAssets = {
        adapterSrc: assets.find(url => url.endsWith('.js')),
        styleSrc: assets.find(url => url.endsWith('.css'))
      };
      this.emitFile({
        type: 'asset',
        fileName: 'adapter/no-telemetry.js',
        source: await readFile(telemetryFile())
      });
    },
    configureServer(server) {
      let middleware = null;
      server.middlewares.use((req, res, next) => {
        Promise.resolve().then(async () => {
          if (!middleware) {
            const current = await ensureRelease();
            middleware = createVendorMiddleware({
              base: siteBase,
              basePath,
              extraReplacements: current.extraReplacements,
              playAssets: playAssets(),
              files: { '/adapter/no-telemetry.js': telemetryFile() }
            });
          }
          await middleware(req, res, next);
        }).catch(next);
      });
    },
    async writeBundle() {
      if (command !== 'build' || !builtAssets || emitted) return;
      emitted = true;
      const current = await ensureRelease();
      await emitVendor(outDir, basePath, current.extraReplacements, builtAssets);
      await scanDist(outDir);
      console.log(`Built ${ORIGINAL_RELEASE} with base ${siteBase}.`);
    }
  };
}
