import { PUBLIC_PATHS } from '../config.mjs';
import { createOrchestrator } from './orchestrator.mjs';

export function orbipom({ basePath }) {
  const orchestrator = createOrchestrator({ basePath });
  return [
    {
      name: 'orbipom-prepare',
      enforce: 'pre',
      async configResolved(config) {
        orchestrator.configure(config);
        await orchestrator.prepare();
      }
    },
    {
      name: 'orbipom',
      enforce: 'post',
      transformIndexHtml: {
        order: 'pre',
        handler(html) {
          return orchestrator.injectDocumentPolicy(html);
        }
      },
      async generateBundle(_options, bundle) {
        const telemetry = await orchestrator.captureRuntime(bundle);
        if (!telemetry) return;
        this.emitFile({
          type: 'asset',
          fileName: PUBLIC_PATHS.telemetryStub.slice(1),
          source: telemetry
        });
      },
      configureServer(server) {
        orchestrator.attachDevServer(server);
      },
      async writeBundle() {
        await orchestrator.emit();
      }
    }
  ];
}
