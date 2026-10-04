import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { orbipom } from './lib/vite-plugin.mjs';
import { viteBase } from './lib/site.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const basePath = process.env.ORBIPOM_BASE_PATH ?? '/';

export default defineConfig({
  root: 'src',
  base: viteBase(basePath),
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
    modulePreload: { polyfill: false }
  },
  plugins: [orbipom({ basePath })]
});
