import { readFile } from 'node:fs/promises';
import path from 'node:path';
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

  function telemetryFile() {
    return path.join(sourceRoot, 'adapter', 'no-telemetry.js');
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
      releaseTask = verifySnapshot().then(snapshot => {
        const stub = siteUrl(basePath, '/adapter/no-telemetry.js');
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
    async generateBundle() {
      if (command !== 'build') {
        return;
      }
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
    async closeBundle() {
      if (command !== 'build') {
        return;
      }
      const current = await ensureRelease();
      const home = await readFile(path.join(outDir, 'index.html'), 'utf8');
      const adapterSrc = home.match(/<script type="module"[^>]* src="([^"]+)"/)?.[1];
      const styleSrc = home.match(/<link rel="stylesheet"[^>]* href="([^"]+)"/)?.[1];
      if (!adapterSrc || !styleSrc) {
        throw new Error('Built homepage is missing the adapter module or stylesheet.');
      }
      await emitVendor(outDir, basePath, current.extraReplacements, { adapterSrc, styleSrc });
      await scanDist(outDir);
      console.log(`Built ${ORIGINAL_RELEASE} with base ${siteBase}.`);
    }
  };
}
