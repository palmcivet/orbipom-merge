import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite';
import { viteBase } from './lib/config.mjs';
import { orbipom } from './lib/vite-plugin/index.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const basePath = process.env.ORBIPOM_BASE_PATH ?? '/';
const base = viteBase(basePath);

export default defineConfig({
  root: 'src',
  base,
  publicDir: false,
  appType: 'mpa',
  cacheDir: path.join(root, 'node_modules/.vite'),
  server: {
    host: '127.0.0.1',
    port: 5173
  },
  preview: {
    host: '127.0.0.1',
    port: 4173
  },
  build: {
    outDir: path.join(root, 'dist'),
    emptyOutDir: true,
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: [
        path.join(root, 'src/index.html'),
        path.join(root, 'src/play/index.html')
      ]
    }
  },
  plugins: [
    VitePWA({
      strategies: 'injectManifest',
      srcDir: '.',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifestFilename: 'assets/manifest.webmanifest',
      manifest: {
        name: '融合！山团团！',
        short_name: '山团团',
        description: '本地离线版。图片和声音优先用官方地址，打不开时用本站备份。',
        lang: 'zh-CN',
        display: 'fullscreen',
        background_color: '#c2f0dc',
        theme_color: '#57c5a6',
        icons: []
      },
      pwaAssets: {
        image: '../vendor/original/site/assets/imgs/11.3df86f.png',
        overrideManifestIcons: true,
        includeHtmlHeadLinks: true,
        injectThemeColor: false,
        integration: {
          publicDir: path.join(root, 'vendor/original/site/assets/imgs'),
          outDir: path.join(root, 'dist/assets'),
          baseUrl: `${base}assets/`
        }
      },
      injectManifest: {
        globPatterns: [
          'index.html',
          'play/index.html',
          'play/game.html',
          'offline/no-telemetry.js',
          'assets/*.{js,css,ico,png}'
        ],
        globIgnores: ['**/site/**', '**/vendor/**', '**/shared/**']
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    }),
    ...orbipom({ basePath })
  ]
});
