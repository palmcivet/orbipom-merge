(function () {
  'use strict';

  const STORAGE_KEY = 'orbipom.offline.profile.v1';
  const SCORE_LIMIT = 99999;
  const NICKNAME_LIMIT = 24;
  const UNLOCK_MIN = 5;
  const UNLOCK_MAX = 11;
  const HISTORY_LIMIT = 100;
  const HISTORY_PREVIEW = 10;
  const SAVE_FILE_LIMIT = 1000000;
  const SAVE_INTERVAL_MS = 300;
  const CLAIMED_TASKS = new Set(['merge', 'skill', 'highScore', 'share', 'goldenAdmin']);

  function sitePath(pathname) {
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    const suffix = pathname === '/' ? '/' : (pathname.startsWith('/') ? pathname : `/${pathname}`);
    return `${base}${suffix}`;
  }
  let stores = null;
  let storageAvailable = true;
  let lastSaveAt = 0;
  let saveTimer = null;
  let panel = null;

  function boundedInteger(value, maximum, fallback = 0) {
    return Number.isFinite(value) ? Math.min(maximum, Math.max(0, Math.floor(value))) : fallback;
  }

  function emptyProfile() {
    return { schema: 1, nickname: '本地管理员', highScore: 0, submittedBest: 0, unlockedMax: UNLOCK_MIN, guideDone: false, mergeCountTotal: 0, skillUseTotal: 0, shared: false, claimed: [], history: [], updatedAt: null };
  }

  function nicknameOf(value) {
    return typeof value === 'string' && value.trim() ? value.trim().slice(0, NICKNAME_LIMIT) : '本地管理员';
  }

  function normalizeHistory(history) {
    if (!Array.isArray(history)) {
      return [];
    }
    return history.slice(-HISTORY_LIMIT).filter(record => record && Number.isFinite(record.score)).map(record => ({
      score: boundedInteger(record.score, SCORE_LIMIT),
      at: typeof record.at === 'string' ? record.at : '',
      merges: boundedInteger(record.merges, Number.MAX_SAFE_INTEGER),
      skills: boundedInteger(record.skills, Number.MAX_SAFE_INTEGER)
    }));
  }

  function normalizeProfile(value) {
    if (!value || value.schema !== 1) {
      throw new Error('不支持的存档格式');
    }
    return {
      schema: 1,
      nickname: nicknameOf(value.nickname),
      highScore: boundedInteger(value.highScore, SCORE_LIMIT),
      submittedBest: boundedInteger(value.submittedBest, SCORE_LIMIT),
      unlockedMax: Math.max(UNLOCK_MIN, boundedInteger(value.unlockedMax, UNLOCK_MAX, UNLOCK_MIN)),
      guideDone: value.guideDone === true,
      mergeCountTotal: boundedInteger(value.mergeCountTotal, Number.MAX_SAFE_INTEGER),
      skillUseTotal: boundedInteger(value.skillUseTotal, Number.MAX_SAFE_INTEGER),
      shared: value.shared === true,
      claimed: Array.isArray(value.claimed) ? [...new Set(value.claimed.filter(taskId => CLAIMED_TASKS.has(taskId)))] : [],
      history: normalizeHistory(value.history),
      updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : null
    };
  }

  function readProfile() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? normalizeProfile(JSON.parse(saved)) : emptyProfile();
    } catch (error) {
      storageAvailable = false;
      console.warn('[offline.save] 存档不可用，暂用内存。可在 F10 面板导出备份。', error);
      return emptyProfile();
    }
  }

  let profile = readProfile();

  function persistNow() {
    clearTimeout(saveTimer);
    saveTimer = null;
    profile.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      storageAvailable = true;
    } catch (error) {
      storageAvailable = false;
      console.warn('[offline.save]', error);
    }
    lastSaveAt = Date.now();
  }

  function persist() {
    if (Date.now() - lastSaveAt >= SAVE_INTERVAL_MS) {
      persistNow();
    } else if (!saveTimer) {
      saveTimer = setTimeout(persistNow, SAVE_INTERVAL_MS);
    }
  }

  function success(data) {
    return Promise.resolve({ code: 0, msg: 'success', data });
  }

  const api = {
    user: {
      requestLogin: () => success(null),
      requestSyncRole: () => success({ roleId: 'offline-local', serverId: 'offline', uid: 'LOCAL', nickname: profile.nickname, avatar: null })
    },
    game: {
      requestGameProfile: () => success({ highScore: profile.highScore, unlockedMax: profile.unlockedMax, guideDone: profile.guideDone }),
      requestMarkGuide: () => {
        profile.guideDone = true;
        persistNow();
        return success(null);
      },
      requestRecordMerge: level => {
        profile.unlockedMax = Math.max(profile.unlockedMax, boundedInteger(level, UNLOCK_MAX));
        persist();
        return success({ mergeCountTotal: profile.mergeCountTotal, unlockedMax: profile.unlockedMax });
      },
      requestRecordSkill: () => success({ skillUseTotal: profile.skillUseTotal }),
      requestSubmitScore: ({ score }) => {
        const normalizedScore = boundedInteger(score, SCORE_LIMIT);
        const isNewBest = normalizedScore > profile.submittedBest;
        profile.submittedBest = Math.max(profile.submittedBest, normalizedScore);
        profile.highScore = Math.max(profile.highScore, normalizedScore);
        const game = stores ? stores.game.getState() : null;
        profile.history.push({ score: normalizedScore, at: new Date().toISOString(), merges: game ? game.mergeCount : 0, skills: game ? game.skillUseCount : 0 });
        profile.history = profile.history.slice(-HISTORY_LIMIT);
        persistNow();
        return success({ best: profile.highScore, isNewBest });
      }
    },
    leaderboard: {
      requestLeaderboard: () => {
        const self = { rank: 1, nickname: profile.nickname, avatar: null, score: profile.highScore, isNpc: false };
        return success({ list: [self], self });
      }
    },
    reward: {
      getReward: () => success({ tasks: [], claimableCount: 0 }),
      claim: () => Promise.resolve({ code: -1, msg: '挑战与礼物功能已移除', data: null }),
      claimAll: () => success({ results: [] }),
      share: () => {
        profile.shared = true;
        persistNow();
        return success(null);
      }
    }
  };

  function downloadFile(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function exportSave() {
    persistNow();
    const url = URL.createObjectURL(new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' }));
    downloadFile(url, `山团团-本地存档-${new Date().toISOString().slice(0, 10)}.json`);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  function connect(originalStores) {
    stores = originalStores;
    stores.game.subscribe((current, previous) => {
      let changed = false;
      if (current.mergeCount > previous.mergeCount) {
        profile.mergeCountTotal += current.mergeCount - previous.mergeCount;
        changed = true;
      }
      if (current.skillUseCount > previous.skillUseCount) {
        profile.skillUseTotal += current.skillUseCount - previous.skillUseCount;
        changed = true;
      }
      if (current.unlockedMax > profile.unlockedMax) {
        profile.unlockedMax = current.unlockedMax;
        changed = true;
      }
      if (current.highScore > profile.highScore) {
        profile.highScore = current.highScore;
        changed = true;
      }
      if (current.guideDone && !profile.guideDone) {
        profile.guideDone = true;
        changed = true;
      }
      if (changed) {
        persist();
      }
    });
    window.dispatchEvent(new Event('orbipom-offline-ready'));
  }

  function prepareSdk(sdk) {
    sdk.Bridge.getPlatform = () => sdk.Platform.Qt;
    sdk.Bridge.getENV = () => ({ language: 'zh-cn', game: sdk.EGame.ENDFIELD });
    sdk.Bridge.getIsCloud = () => false;
    sdk.Bridge.invoke = () => Promise.resolve();
    sdk.Bridge.invokeWithReturnValue = () => Promise.resolve({});
    sdk.WebView.event = () => Promise.resolve();
    sdk.WebView.initETL = () => Promise.resolve();
    sdk.WebView.ready = () => Promise.resolve();
    sdk.WebView.setCursorVisible = () => {};
    sdk.WebView.getShareChannels = () => [];
    sdk.WebView.share = (channel, content) => {
      const filename = content.fileName || '山团团-成绩';
      downloadFile(content.image, filename.toLowerCase().endsWith('.png') ? filename : `${filename}.png`);
      return Promise.resolve({ status: 0, savedPath: '浏览器下载目录（本地图片）' });
    };
    sdk.WebView.close = () => {
      persistNow();
      window.location.assign(sitePath('/'));
      return Promise.resolve();
    };
    return sdk;
  }

  function snapshot() {
    const game = stores ? stores.game.getState() : null;
    const plainGame = game ? Object.fromEntries(Object.entries(game).filter(([, value]) => typeof value !== 'function')) : null;
    return { release: 'v1d5-synthesize-tuantuan-web@1.1.2', storageAvailable, profile: structuredClone(profile), scene: stores ? stores.scene.getState().globalScene : null, game: plainGame };
  }

  function importSave() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      try {
        if (!input.files[0]) {
          return;
        }
        if (input.files[0].size > SAVE_FILE_LIMIT) {
          throw new Error('存档文件过大');
        }
        const imported = normalizeProfile(JSON.parse(await input.files[0].text()));
        if (window.confirm('导入将替换当前本地记录并重新开始一局，继续吗？')) {
          profile = imported;
          persistNow();
          window.location.reload();
        }
      } catch (error) {
        window.alert(`导入失败：${error.message}`);
      }
    };
    input.click();
  }

  function renamePlayer() {
    const nickname = window.prompt(`本地排行榜昵称（最多 ${NICKNAME_LIMIT} 字）`, profile.nickname);
    if (!nickname || !nickname.trim()) {
      return;
    }
    profile.nickname = nickname.trim().slice(0, NICKNAME_LIMIT);
    persistNow();
    if (!stores) {
      return;
    }
    const data = stores.data.getState();
    data.setUserInfo({ ...data.userInfo, nickname: profile.nickname });
  }

  function restartPlay(message, reset) {
    if (!window.confirm(message)) {
      return;
    }
    reset();
    persistNow();
    window.location.assign(sitePath('/play/'));
  }

  function panelActions() {
    return [
      ['导出存档', exportSave],
      ['导入存档', importSave],
      ['修改昵称', renamePlayer],
      ['重看新手引导', () => restartPlay('重看引导会开始新的一局，继续吗？', () => {
        profile.guideDone = false;
      })],
      ['清空本地记录', () => restartPlay('清空所有本地分数、图鉴和对局记录？建议先导出备份。', () => {
        profile = emptyProfile();
      })],
      ['继续游戏', closePanel]
    ];
  }

  function closePanel() {
    if (!panel) {
      return;
    }
    const wasPaused = panel.dataset.wasPaused === 'true';
    panel.remove();
    panel = null;
    if (stores) {
      stores.game.getState().setPaused(wasPaused);
    }
  }

  function openPanel() {
    if (panel) {
      closePanel();
      return;
    }
    panel = document.createElement('dialog');
    panel.id = 'orbipom-offline-panel';
    panel.dataset.wasPaused = String(stores ? stores.game.getState().paused : false);
    if (stores) {
      stores.game.getState().setPaused(true);
    }
    const heading = document.createElement('h2');
    heading.textContent = '山团团 · 本地离线版';
    const description = document.createElement('p');
    description.textContent = '保留原版玩法与视听资源。礼物和挑战入口已移除；仅记录本地分数、图鉴与对局进度。刷新会开始新的一局。';
    const status = document.createElement('p');
    status.textContent = `最高分 ${profile.highScore} · 累计合成 ${profile.mergeCountTotal} · 战技 ${profile.skillUseTotal} · 图鉴 ${profile.unlockedMax}/11${storageAvailable ? '' : ' · 存储不可用，请导出备份'}`;
    const actions = document.createElement('div');
    actions.className = 'offline-actions';
    for (const [label, handler] of panelActions()) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.onclick = handler;
      actions.appendChild(button);
    }
    panel.append(heading, description, status, actions);
    if (profile.history.length) {
      const history = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = '最近的本地结算';
      const list = document.createElement('ol');
      for (const record of profile.history.slice(-HISTORY_PREVIEW).reverse()) {
        const item = document.createElement('li');
        item.textContent = `${record.score} 分 · ${record.merges} 次合成 · ${record.skills} 次战技 · ${record.at.replace('T', ' ').slice(0, 19)}`;
        list.appendChild(item);
      }
      history.append(summary, list);
      panel.appendChild(history);
    }
    panel.addEventListener('cancel', event => {
      event.preventDefault();
      closePanel();
    });
    document.body.appendChild(panel);
    panel.showModal();
  }

  try {
    sessionStorage.setItem('u8_token', 'offline-local-only');
    sessionStorage.setItem('server', 'offline');
  } catch (error) {
    console.warn('[offline.session]', error);
  }
  window.WVSDK = { ENV: { language: 'zh-cn' }, callback: {}, API: {}, platform: 'Qt' };
  window.OrbipomOffline = { api, prepareSdk, connect, ignoreTelemetry() {}, snapshot, exportSave, openPanel, get stores() { return stores; } };
  window.addEventListener('pagehide', persistNow);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      persistNow();
    }
  });
  document.addEventListener('keydown', event => {
    if (event.code === 'F10') {
      event.preventDefault();
      event.stopPropagation();
      openPanel();
    }
  }, true);
  document.addEventListener('DOMContentLoaded', () => {
    const badge = document.createElement('button');
    badge.id = 'orbipom-offline-badge';
    badge.type = 'button';
    badge.textContent = '本地离线 · F10';
    badge.title = '本地存档、备份和版本信息（F10）';
    badge.onclick = openPanel;
    document.body.appendChild(badge);
  });
}());
