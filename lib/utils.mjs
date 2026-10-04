import { cspMeta, siteUrl } from './site.mjs';

const ORIGINAL_ASSET_BASE = 'https://web.hycdn.cn/endfield/webview/unn3irGqmsvyaKnFbTug/act/orbipom-merge-XaVa5Tz/';
const SDK_ENTRY_URL = 'https://web.hycdn.cn/hg_web_sdk/lib/sdk.entry.js';
const SDK_PUBLIC_PATH = 'https://web.hycdn.cn/hg_web_sdk/lib/3.0.3/';
const REACT_URL = 'https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js';
const REACT_DOM_URL = 'https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js';

function createReplacements(basePath) {
  const local = suffix => siteUrl(basePath, suffix);
  return [
    [ORIGINAL_ASSET_BASE, local('/site/')],
    ['https://web.hycdn.cn/static/js/umd/react-dom/react-dom@18.3.1.js', REACT_DOM_URL],
    ['https://web.hycdn.cn/static/js/umd/react/react@18.3.1.js', REACT_URL],
    ['https://web.hycdn.cn/webview/static/fonts/', local('/shared/')],
    ['https://web-static.hg-cdn.com/webview/static/fonts/', local('/shared/')],
    [SDK_ENTRY_URL, local('/vendor/hg-web-sdk/sdk.entry.js')],
    [SDK_PUBLIC_PATH, local('/vendor/hg-web-sdk/3.0.3/')]
  ];
}

function replaceExactly(source, original, replacement) {
  const occurrences = source.split(original).length - 1;
  if (occurrences !== 1) {
    throw new Error(`Original build mismatch: expected one ${JSON.stringify(original)}, found ${occurrences}`);
  }
  return source.replace(original, replacement);
}

export function rewriteAssetUrls(source, basePath, extraReplacements = []) {
  const pairs = [...createReplacements(basePath), ...extraReplacements].sort((left, right) => right[0].length - left[0].length);
  for (const [original, replacement] of pairs) {
    source = source.replaceAll(original, replacement);
  }
  return source;
}

export function adaptGameBundle(source, basePath, extraReplacements = []) {
  source = replaceExactly(source, 'var p=r(61402),', 'var p=window.OrbipomOffline.prepareSdk(r(61402)),');
  source = replaceExactly(source, 'y.T({dsn:', 'window.OrbipomOffline.ignoreTelemetry({dsn:');
  source = replaceExactly(source, 'eV=(n={http:', 'eV=window.OrbipomOffline.api,offlineArchivedApi=(n={http:');
  source = replaceExactly(source, 'dh(f().Fragment,uQ)', 'window.OrbipomOffline.connect({game:e3,scene:S,data:ty,rewards:tg,progress:e8,locale:j,config:ey,getEngine:()=>ih}),dh(f().Fragment,uQ)');
  source = replaceExactly(source, '(0,m.jsxs)(sl,{ref:e=>{B.current[1]=e},className:t_()(cU,cK,{[cq]:P&&1===C}),label:M("biz.modal_reward.title"),"data-sfx-key":"none",onClick:eh,children:[(0,m.jsx)(c0,{name:"gift"}),r?(0,m.jsx)(ln,{}):null]},"reward")', 'null');
  source = replaceExactly(source, '(0,m.jsxs)(sl,{ref:e=>{v.current[1]=e},className:uS,label:M("biz.modal_reward.title"),"data-sfx-key":"none",onFocus:()=>h(1),onClick:j,children:[(0,m.jsx)(uz,{name:"gift",focusIcon:uV}),r?(0,m.jsx)(ln,{}):null]})', 'null');
  source = replaceExactly(source, 'ax=()=>ro(e=>{var{onClose:t}=e;return f().createElement(iB,{onClose:t})})', 'ax=()=>{}');
  source = replaceExactly(source, 'ea=(0,g.useCallback)(e=>{en(!1),er(I.current+e)},[er,en])', 'ea=(0,g.useCallback)(direction=>{en(!1);var available=B.current.map((element,index)=>element?index:null).filter(index=>index!==null);er(available[(available.indexOf(I.current)+direction+available.length)%available.length])},[er,en])');
  source = replaceExactly(source, '_=(0,g.useCallback)(e=>{var t,r=(e+2)%2;y.current=r,null==(t=p.current[r])||t.focus({preventScroll:!0})},[])', '_=(0,g.useCallback)(e=>{var t,r=0;y.current=r,null==(t=p.current[r])||t.focus({preventScroll:!0})},[])');
  source = source.replaceAll('https://ef-webview.hypergryph.com/act-server/orbipom-merge', siteUrl(basePath, '/offline/blocked-original-api'));
  return rewriteAssetUrls(source, basePath, extraReplacements);
}

export function adaptEntryBundle(source, basePath, extraReplacements = []) {
  source = replaceExactly(source, 't.exports=l}()},18683:', 't.exports=window.OrbipomOffline.prepareSdk(l)}()},18683:');
  return rewriteAssetUrls(source, basePath, extraReplacements);
}

export function adaptChineseLocale(source, basePath, extraReplacements = []) {
  const wording = [
    ['"title":"排行榜"', '"title":"本地排行榜"'],
    ['"title":"任务奖励"', '"title":"本地挑战"'],
    ['"mail_sent":"已发送至游戏内邮箱"', '"mail_sent":"已记录至本地（非官方奖励）"'],
    ['"join_desc":"活动中心解锁后"', '"join_desc":"离线游玩，无需官方账号"'],
    ['"notice_1":"活动期间，系统将根据管理员过往游玩过程中的历史最高分与好友们进行排名，前25名会在排行榜上展示。"', '"notice_1":"排行榜只展示当前浏览器的本地最高分；不会上传成绩或读取官方好友数据。"'],
    ['"notice_2":"完成任务并领取奖励后，奖励将通过游戏内邮件发放。邮件有效期为30天，请及时领取。"', '"notice_2":"本版本不包含挑战、礼物领取或官方奖励。最高分和图鉴保存在当前浏览器，F10 可导入、导出存档。"'],
    ['"play_desc":"管理员通过融合相同的山团团，找到更大的山团团并获得积分，领取丰厚奖励。"', '"play_desc":"管理员通过融合相同的山团团，找到更大的山团团并获得积分，挑战自己的最高纪录。"']
  ];
  for (const [original, replacement] of wording) {
    source = replaceExactly(source, original, replacement);
  }
  return rewriteAssetUrls(source, basePath, extraReplacements);
}

export function adaptHtml(source, basePath, extraReplacements = [], assets = {}) {
  const { adapterSrc, styleSrc } = assets;
  if (!adapterSrc || !styleSrc) {
    throw new Error('Play page requires the adapter script and stylesheet URLs.');
  }
  source = rewriteAssetUrls(source, basePath, extraReplacements);
  source = replaceExactly(source, '<html lang="zh-cn">', '<html lang="zh-cn" class="offline-play">');
  source = replaceExactly(source, '<head>', `<head>${cspMeta()}<meta name="theme-color" content="#83ccb7">`);
  source = replaceExactly(source, '<title>融合！山团团！</title>', '<title>融合！山团团！ · 本地离线版</title>');
  source = replaceExactly(source, '</head>', `<link rel="stylesheet" href="${styleSrc}"><script type="module" src="${adapterSrc}"></script></head>`);
  source = source.replace(/<link as="audio"[^>]*rel="preload">/g, '');
  return source;
}
