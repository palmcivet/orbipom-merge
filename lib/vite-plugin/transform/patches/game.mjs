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
  swap('rU=_.Lb?rW:(0,rH.i)("https://web.hycdn.cn/hg_web_sdk/lib/sdk.entry.js")', 'rU=rW', 'drop-web-sdk');
  swap('y.T({dsn:', 'window.orbipom.ignoreTelemetry({dsn:', 'ignore-telemetry');
  swap('eV=(n={http:', 'eV=window.orbipom.api,offlineArchivedApi=(n={http:', 'offline-api');
  swap(
    'dh(f().Fragment,uQ)',
    'window.orbipom.connect({game:e3,scene:S,data:ty,rewards:tg,progress:e8,locale:j,config:ey,getEngine:()=>ih,debug:{dev:tA,game:e3,config:lR,locale:j,scene:S,scenes:a_}}),dh(f().Fragment,uQ)',
    'connect-session'
  );
  swap('c=tA(e=>null)', 'c=tA(e=>e.skillPreview)', 'enable-skill-preview');
  swap('g=tA(e=>!1)', 'g=tA(e=>e.infiniteEnergy)', 'enable-infinite-energy');
  swap(
    '(0,m.jsxs)(sl,{ref:e=>{B.current[1]=e},className:t_()(cU,cK,{[cq]:P&&1===C}),label:M("biz.modal_reward.title"),"data-sfx-key":"none",onClick:eh,children:[(0,m.jsx)(c0,{name:"gift"}),r?(0,m.jsx)(ln,{}):null]},"reward")',
    '(0,m.jsx)(sl,{ref:e=>{B.current[1]=e},className:t_()("orbipom-tools-button",cU,cK,{[cq]:P&&1===C}),label:"本地工具",title:"本地存档与调试（F10）","data-sfx-key":"none",onClick:function(){var t=window.orbipom;t&&t.toggleTools&&t.toggleTools()},children:(0,m.jsx)("img",{src:"https://web.hycdn.cn/endfield/webview/unn3irGqmsvyaKnFbTug/act/orbipom-merge-XaVa5Tz/assets/imgs/badge-icon.f7eebc.png",alt:"",className:"orbipom-tools-icon"})},"tools")',
    'local-tools-button'
  );
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
  swap(
    'get cssScale(){var e=this.canvas.getBoundingClientRect(),t=ey.container.width+2*ey.canvasPadX;return e.width/t||1}toWorldX(e){return(e-this.canvas.getBoundingClientRect().left)/this.cssScale-ey.canvasPadX}toWorldY(e){var t=this.canvas.getBoundingClientRect(),r=ey.dropZoneHeight+ey.canvasPadTop;return(e-t.top)/this.cssScale-r}',
    'get cssScale(){var e=document.body.dataset.rotate==="1"?this.canvas.offsetWidth:this.canvas.getBoundingClientRect().width,t=ey.container.width+2*ey.canvasPadX;return e/t||1}toWorldX(e,t){return window.orbipom.canvasLocal(this.canvas,e,t).x/this.cssScale-ey.canvasPadX}toWorldY(e,t){var r=ey.dropZoneHeight+ey.canvasPadTop;return window.orbipom.canvasLocal(this.canvas,e,t).y/this.cssScale-r}',
    'rotate-pointer'
  );
  swap(
    'var n=this.renderer.toWorldX(e),i=this.pointerWorldY(t);',
    'var n=this.renderer.toWorldX(e,t),i=this.pointerWorldY(e,t);',
    'rotate-pointer-move'
  );
  swap(
    'pointerWorldY(e){return this.renderer.toWorldY(e)}',
    'pointerWorldY(e,t){return this.renderer.toWorldY(e,t)}',
    'rotate-pointer-y'
  );
  swap(
    'var r=this.renderer.toWorldX(e.clientX),n=this.pointerWorldY(e.clientY);',
    'var r=this.renderer.toWorldX(e.clientX,e.clientY),n=this.pointerWorldY(e.clientX,e.clientY);',
    'rotate-pointer-up'
  );
  swap(
    'var r=e.getBoundingClientRect(),u={x:r.left,y:r.top,width:r.width,height:r.height};',
    'var u=window.orbipom.stageBounds(e);',
    'rotate-guide-bounds'
  );
  swap(
    'return window.addEventListener("resize",d),h(),()=>{s&&cancelAnimationFrame(s),c.disconnect(),u(),window.removeEventListener("resize",d)}',
    'var p=new MutationObserver(d);return p.observe(document.body,{attributes:!0,attributeFilter:["data-rotate"]}),window.addEventListener("resize",d),h(),()=>{s&&cancelAnimationFrame(s),c.disconnect(),p.disconnect(),u(),window.removeEventListener("resize",d)}',
    'rotate-guide-watch'
  );
  swap(
    '[G,R]=(0,g.useState)(()=>({width:window.innerWidth,height:window.innerHeight,scale:rh()/16}));(0,g.useEffect)(()=>{var e=0,t=()=>{e=0,R({width:window.innerWidth,height:window.innerHeight,scale:rh()/16})},r=()=>{e||(e=requestAnimationFrame(t))},n=rm(r);return window.addEventListener("resize",r),()=>{e&&cancelAnimationFrame(e),n(),window.removeEventListener("resize",r)}},[])',
    '[G,R]=(0,g.useState)(()=>window.orbipom.stageMetrics(rh()/16));(0,g.useEffect)(()=>{var e=0,t=()=>{e=0;var n=window.orbipom.stageMetrics(rh()/16);R(function(e){return e.width===n.width&&e.height===n.height&&e.scale===n.scale?e:n})},r=()=>{e||(e=requestAnimationFrame(t))},n=rm(r),i=new ResizeObserver(r),a=new MutationObserver(r);return i.observe(document.body),a.observe(document.body,{attributes:!0,attributeFilter:["data-rotate"]}),window.addEventListener("resize",r),()=>{e&&cancelAnimationFrame(e),i.disconnect(),a.disconnect(),n(),window.removeEventListener("resize",r)}},[])',
    'rotate-guide-metrics'
  );
  swap(
    'var r=e.getBoundingClientRect().height;',
    'var r=window.orbipom.stageLayoutHeight(e);',
    'rotate-guide-panel'
  );
  patched = patched.replaceAll(BLOCKED_API_ORIGIN, siteUrl(context.basePath, PUBLIC_PATHS.blockedApi));
  return rewriteAssetUrls(patched, context);
}
