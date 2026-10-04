import { registerSW } from 'virtual:pwa-register';

const base = import.meta.env.BASE_URL;
const status = document.querySelector('#status');

registerSW({
  immediate: true,
  onRegisterError(error) {
    console.warn('[offline.sw]', error);
    if (status) status.textContent = '页面缓存没有就绪，正在进入游戏。';
  }
});

const ready = navigator.serviceWorker?.ready ?? Promise.resolve();
const timeout = new Promise(resolve => setTimeout(resolve, 8000));
Promise.race([ready, timeout]).finally(() => {
  location.replace(`${base}play/game.html`);
});
