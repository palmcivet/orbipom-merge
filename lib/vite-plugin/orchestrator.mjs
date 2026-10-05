import { readFile } from 'node:fs/promises';
import { ORIGINAL_RELEASE, PUBLIC_PATHS, TELEMETRY_SOURCES, cdnManifestFile, cspMeta, siteUrl, telemetryStubFile } from '../config.mjs';
import { verifySnapshot } from '../snapshot/verify.mjs';
import { createCatalog } from './catalog.mjs';
import { writeCdnManifest } from './cdn-manifest.mjs';
import { createDevMiddleware } from './dev-server.mjs';
import { emitRelease, scanDist } from './emit.mjs';

function runtimeFromBundle(bundle) {
  const chunk = Object.values(bundle).find(item => item.type === 'chunk' && (item.moduleIds ?? []).some(id => id.replaceAll('\\', '/').endsWith('/src/offline/index.js')));
  if (!chunk) throw new Error('Offline runtime was not bundled.');
  const imported = [...(chunk.viteMetadata?.importedCss ?? [])];
  const discovered = imported.length ? imported : Object.values(bundle)
    .filter(item => item.type === 'asset' && item.fileName.endsWith('.css') && String(item.source).includes('#orbipom-offline-panel'))
    .map(item => item.fileName);
  if (discovered.length !== 1) {
    throw new Error(`Offline runtime should emit one stylesheet, found ${discovered.length}.`);
  }
  return { fileName: chunk.fileName, styleName: discovered[0] };
}

export function createOrchestrator({ basePath }) {
  let command = 'serve';
  let outDir = '';
  let siteBase = '/';
  let release = null;
  let preparing = null;
  let runtimeAssets = null;
  let emitted = false;

  function devRuntime() {
    return { scriptSrc: siteUrl(basePath, PUBLIC_PATHS.runtimeScript) };
  }

  function contextFor(assets) {
    return {
      basePath,
      extraReplacements: release.extraReplacements,
      runtime: assets
    };
  }

  async function prepare() {
    if (release) return release;
    if (!preparing) {
      preparing = verifySnapshot().then(async snapshot => {
        const catalog = createCatalog(snapshot);
        await writeCdnManifest(snapshot, basePath, cdnManifestFile);
        release = {
          catalog,
          extraReplacements: TELEMETRY_SOURCES.map(source => [source, siteUrl(basePath, PUBLIC_PATHS.telemetryStub)])
        };
        return release;
      });
    }
    return preparing;
  }

  return {
    configure(config) {
      command = config.command;
      outDir = config.build.outDir;
      siteBase = config.base;
    },
    prepare,
    injectDocumentPolicy(html) {
      return html.replace('<head>', `<head>${cspMeta()}`);
    },
    async captureRuntime(bundle) {
      if (command !== 'build') return null;
      const runtime = runtimeFromBundle(bundle);
      runtimeAssets = {
        scriptSrc: `${siteBase}${runtime.fileName}`,
        styleSrc: `${siteBase}${runtime.styleName}`
      };
      return readFile(telemetryStubFile);
    },
    attachDevServer(server) {
      let middleware = null;
      server.middlewares.use((req, res, next) => {
        Promise.resolve().then(async () => {
          if (!middleware) {
            const current = await prepare();
            middleware = createDevMiddleware({
              base: siteBase,
              catalog: current.catalog,
              getContext: async () => contextFor(devRuntime())
            });
          }
          await middleware(req, res, next);
        }).catch(next);
      });
    },
    async emit() {
      if (command !== 'build' || emitted) return;
      if (!runtimeAssets?.scriptSrc || !runtimeAssets.styleSrc) {
        throw new Error('Offline runtime script or stylesheet was not captured from the build.');
      }
      emitted = true;
      const current = await prepare();
      await emitRelease({ outDir, catalog: current.catalog, context: contextFor(runtimeAssets) });
      await scanDist(outDir);
      console.log(`Built ${ORIGINAL_RELEASE} with base ${siteBase}.`);
    }
  };
}
