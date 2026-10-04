import { emptyProfile, normalizeProfile } from './profile.js';

const STORAGE_KEY = 'orbipom.offline.profile.v1';
const SAVE_INTERVAL_MS = 300;

export function createProfileStore(storage = localStorage) {
  let available = true;
  let profile = emptyProfile();
  let lastSaveAt = 0;
  let saveTimer = null;

  try {
    const saved = storage.getItem(STORAGE_KEY);
    if (saved) profile = normalizeProfile(JSON.parse(saved));
  } catch (error) {
    available = false;
    console.warn('[offline.save] 存档不可用，暂用内存。可在 F10 面板导出备份。', error);
    profile = emptyProfile();
  }

  function persistNow() {
    clearTimeout(saveTimer);
    saveTimer = null;
    profile.updatedAt = new Date().toISOString();
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(profile));
      available = true;
    } catch (error) {
      available = false;
      console.warn('[offline.save]', error);
    }
    lastSaveAt = Date.now();
  }

  function persist() {
    if (Date.now() - lastSaveAt >= SAVE_INTERVAL_MS) persistNow();
    else if (!saveTimer) saveTimer = setTimeout(persistNow, SAVE_INTERVAL_MS);
  }

  return {
    current: () => profile,
    replace(next) {
      profile = next;
    },
    persist,
    persistNow,
    available: () => available
  };
}
