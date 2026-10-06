import { cspMeta, openGraphMeta, viteBase } from '../../../config.mjs';
import { replaceOnce } from '../replace.mjs';
import { rewriteAssetUrls } from '../urls.mjs';

const file = 'original/official-index.html';

export function patchPlayHtml(source, context) {
  const { scriptSrc, styleSrc } = context.runtime;
  if (!scriptSrc) throw new Error('Play page requires the runtime script URL.');
  const base = viteBase(context.basePath);
  let patched = rewriteAssetUrls(source, context);
  const favicon = patched.match(/<link href="[^"]*favicon-hg\.ico" rel="icon">/);
  if (!favicon) throw new Error(`${file} patch "favicon" could not find the original icon link.`);
  patched = patched.replace(favicon[0], `<link rel="icon" href="${base}assets/favicon.ico">`);
  patched = replaceOnce(patched, '<html lang="zh-cn">', '<html lang="zh-cn" class="offline-play">', { file, patch: 'document-class' });
  patched = replaceOnce(
    patched,
    '<head>',
    `<head>${cspMeta()}${openGraphMeta(context.basePath)}<meta name="theme-color" content="#83ccb7"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="山团团"><link rel="manifest" href="${base}assets/manifest.webmanifest"><link rel="apple-touch-icon" href="${base}assets/apple-touch-icon-180x180.png">`,
    { file, patch: 'document-head' }
  );
  patched = replaceOnce(patched, '<title>融合！山团团！</title>', '<title>融合！山团团！ · 本地离线版</title>', { file, patch: 'title' });
  const runtimeTags = [
    styleSrc ? `<link rel="stylesheet" href="${styleSrc}">` : '',
    `<script type="module" src="${scriptSrc}"></script>`
  ].join('');
  patched = replaceOnce(patched, '</head>', `${runtimeTags}</head>`, { file, patch: 'runtime' });
  return patched.replace(/<link as="audio"[^>]*rel="preload">/g, '');
}
