import { registerSW } from 'virtual:pwa-register';

const base = import.meta.env.BASE_URL;
const status = document.querySelector('#status');

registerSW({
  immediate: true,
  onRegisterError(error) {
    console.warn('[offline.cdn]', error);
    if (status) status.textContent = '官方资源不可用，改用本站备份。';
  }
});

const ready = navigator.serviceWorker?.ready ?? Promise.resolve();
const timeout = new Promise(resolve => setTimeout(resolve, 8000));
Promise.race([ready, timeout]).finally(() => {
  location.replace(`${base}play/game.html`);
});
