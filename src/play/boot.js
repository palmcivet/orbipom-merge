import './boot.css';
import { registerSW } from 'virtual:pwa-register';
import { askLoadStatus, directLoadReport, loadLabel, writeLoadReport } from '../pwa/load-status.js';

const base = import.meta.env.BASE_URL;
const stage = document.querySelector('#boot-stage');
const source = document.querySelector('#boot-source');
const bar = document.querySelector('#boot-bar');
const progress = document.querySelector('#boot-progress');
const RESULT_PAUSE_MS = 480;

const registrationFailed = new Promise(resolve => {
  registerSW({
    immediate: true,
    onRegisterError(error) {
      console.warn('[offline.sw]', error);
      resolve();
    }
  });
});

function show(step, stageText, sourceText) {
  if (stage) stage.textContent = stageText;
  if (source) source.textContent = sourceText;
  if (bar) bar.style.width = `${step}%`;
  if (progress) progress.setAttribute('aria-valuenow', String(step));
}

function pause(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function enter(report, stageText) {
  writeLoadReport(report);
  show(100, stageText, loadLabel(report));
  await pause(RESULT_PAUSE_MS);
  location.replace(`${base}play/game.html${location.search}`);
}

async function boot() {
  show(58, '正在确认官方资源', '来源确认中');
  const ready = navigator.serviceWorker?.ready.catch(() => null) ?? Promise.resolve(null);
  let timedOut = false;
  const timeout = new Promise(resolve => {
    setTimeout(() => {
      timedOut = true;
      resolve(null);
    }, 8000);
  });
  const registration = await Promise.race([
    ready,
    timeout,
    registrationFailed.then(() => null)
  ]);
  if (timedOut || !registration?.active) {
    await enter(directLoadReport(), '页面缓存未就绪，直接进入');
    return;
  }
  const report = await askLoadStatus(registration.active) ?? {
    cdnMode: 'unknown',
    counts: { cdn: 0, local: 0, cache: 0 }
  };
  await enter(report, '正在进入活动');
}

requestAnimationFrame(() => {
  boot();
});
