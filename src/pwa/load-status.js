export const LOAD_STATUS_TYPE = 'orbipom:load-status';
export const LOAD_STATUS_KEY = 'orbipom.load.v1';

export function directLoadReport() {
  return {
    method: 'direct',
    cdnMode: 'unknown',
    counts: { cdn: 0, local: 0, cache: 0 }
  };
}

export function loadLabel(report) {
  if (!report || report.method === 'direct') return '本次直接进入';
  const cdn = Number(report.counts?.cdn) || 0;
  const local = Number(report.counts?.local) || 0;
  const cache = Number(report.counts?.cache) || 0;
  if (cdn + local + cache === 0) {
    if (report.cdnMode === 'up') return '本次官方 CDN';
    if (report.cdnMode === 'down') return '本次本站备份';
    return '来源确认中';
  }
  if (cdn > 0 && local > 0) return `官方 CDN · 本站 ${local}`;
  if (cdn > 0) return '本次官方 CDN';
  if (local > 0) return '本次本站备份';
  return cache > 0 ? '本次本地缓存' : '来源确认中';
}

export function readLoadReport() {
  try {
    const raw = sessionStorage.getItem(LOAD_STATUS_KEY);
    if (!raw) return null;
    const report = JSON.parse(raw);
    return report && typeof report === 'object' ? report : null;
  } catch {
    return null;
  }
}

export function writeLoadReport(report) {
  try {
    sessionStorage.setItem(LOAD_STATUS_KEY, JSON.stringify(report));
  } catch {
    // Private mode can reject storage; the panel can still ask the worker.
  }
}

export function askLoadStatus(worker, timeoutMs = 6500) {
  if (!worker) return Promise.resolve(null);
  return new Promise(resolve => {
    const channel = new MessageChannel();
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    channel.port1.onmessage = event => finish(event.data);
    try {
      worker.postMessage({ type: LOAD_STATUS_TYPE }, [channel.port2]);
    } catch {
      finish(null);
    }
  });
}

export async function activeWorker() {
  const container = navigator.serviceWorker;
  if (!container) return null;
  if (container.controller) return container.controller;
  try {
    const registration = await container.getRegistration();
    return registration?.active ?? null;
  } catch {
    return null;
  }
}
