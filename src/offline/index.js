import { registerSW } from 'virtual:pwa-register';
import './panel.css';
import { createOfflineApi } from './api.js';
import { installContract } from './contract.js';
import { downloadFile } from './files.js';
import { goHome } from './navigation.js';
import { createSavePanel, mountBadge } from './panel.js';
import { createSaveCommands } from './commands.js';
import { createSdkBridge } from './sdk.js';
import { createGameSession } from './session.js';
import { createProfileStore } from './store.js';

registerSW({
  immediate: true,
  onRegisterError(error) {
    console.warn('[offline.cdn]', error);
  }
});

const profiles = createProfileStore();
const session = createGameSession();
const commands = createSaveCommands({ profiles, session });
const panel = createSavePanel({
  readStatus() {
    const profile = profiles.current();
    return {
      nickname: profile.nickname,
      highScore: profile.highScore,
      mergeCountTotal: profile.mergeCountTotal,
      skillUseTotal: profile.skillUseTotal,
      unlockedMax: profile.unlockedMax,
      storageAvailable: profiles.available(),
      history: profile.history
    };
  },
  commands,
  pause: () => session.pause(),
  resume: wasPaused => session.resume(wasPaused)
});

installContract({
  api: createOfflineApi({ profiles, session }),
  prepareSdk: createSdkBridge({ profiles, downloadFile, goHome }),
  connect: stores => session.connect(stores, profiles)
});

try {
  sessionStorage.setItem('u8_token', 'offline-local-only');
  sessionStorage.setItem('server', 'offline');
} catch (error) {
  console.warn('[offline.session]', error);
}

window.WVSDK = { ENV: { language: 'zh-cn' }, callback: {}, API: {}, platform: 'Qt' };
window.addEventListener('pagehide', () => profiles.persistNow());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) profiles.persistNow();
});
document.addEventListener('keydown', event => {
  if (event.code !== 'F10') return;
  event.preventDefault();
  event.stopPropagation();
  panel.toggle();
}, true);
mountBadge(() => panel.toggle());
