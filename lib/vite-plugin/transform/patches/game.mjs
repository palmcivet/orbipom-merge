import { BLOCKED_API_ORIGIN, PATCH_TARGETS, PUBLIC_PATHS, siteUrl } from '../../../config.mjs';
import { replaceOnce } from '../replace.mjs';
import { rewriteAssetUrls } from '../urls.mjs';

const file = PATCH_TARGETS.game;

export function patchGame(source, context) {
  let patched = source;
  const swap = (needle, replacement, patch) => {
    patched = replaceOnce(patched, needle, replacement, { file, patch });
  };
  swap('var p=r(61402),', 'var p=window.orbipom.prepareSdk(r(61402)),', 'prepare-sdk');
  swap('y.T({dsn:', 'window.orbipom.ignoreTelemetry({dsn:', 'ignore-telemetry');
  swap('eV=(n={http:', 'eV=window.orbipom.api,offlineArchivedApi=(n={http:', 'offline-api');
  swap(
    'dh(f().Fragment,uQ)',
    'window.orbipom.connect({game:e3,scene:S,data:ty,rewards:tg,progress:e8,locale:j,config:ey,getEngine:()=>ih}),dh(f().Fragment,uQ)',
    'connect-session'
  );
  swap('(0,m.jsxs)(sl,{ref:e=>{B.current[1]=e},className:t_()(cU,cK,{[cq]:P&&1===C}),label:M("biz.modal_reward.title"),"data-sfx-key":"none",onClick:eh,children:[(0,m.jsx)(c0,{name:"gift"}),r?(0,m.jsx)(ln,{}):null]},"reward")', 'null', 'remove-reward-button');
  swap('(0,m.jsxs)(sl,{ref:e=>{v.current[1]=e},className:uS,label:M("biz.modal_reward.title"),"data-sfx-key":"none",onFocus:()=>h(1),onClick:j,children:[(0,m.jsx)(uz,{name:"gift",focusIcon:uV}),r?(0,m.jsx)(ln,{}):null]})', 'null', 'remove-gamepad-reward-button');
  swap('ax=()=>ro(e=>{var{onClose:t}=e;return f().createElement(iB,{onClose:t})})', 'ax=()=>{}', 'remove-reward-modal');
  swap(
    'ea=(0,g.useCallback)(e=>{en(!1),er(I.current+e)},[er,en])',
    'ea=(0,g.useCallback)(direction=>{en(!1);var available=B.current.map((element,index)=>element?index:null).filter(index=>index!==null);er(available[(available.indexOf(I.current)+direction+available.length)%available.length])},[er,en])',
    'cycle-available-skills'
  );
  swap(
    '_=(0,g.useCallback)(e=>{var t,r=(e+2)%2;y.current=r,null==(t=p.current[r])||t.focus({preventScroll:!0})},[])',
    '_=(0,g.useCallback)(e=>{var t,r=0;y.current=r,null==(t=p.current[r])||t.focus({preventScroll:!0})},[])',
    'keep-primary-focus'
  );
  patched = patched.replaceAll(BLOCKED_API_ORIGIN, siteUrl(context.basePath, PUBLIC_PATHS.blockedApi));
  return rewriteAssetUrls(patched, context);
}
