const LANGUAGE_CODES = [
  'zh-cn',
  'en-us',
  'ja-jp',
  'ko-kr',
  'zh-tw',
  'de-de',
  'fr-fr',
  'it-it',
  'es-mx',
  'pt-br',
  'ru-ru',
  'id-id',
  'vi-vn',
  'th-th'
];

function storeApi(store) {
  return {
    getState: () => store.getState(),
    subscribe: listener => store.subscribe(listener)
  };
}

function actions(store, names) {
  return Object.fromEntries(names.map(name => [name, (...args) => store.getState()[name](...args)]));
}

function patchState(store, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    throw new TypeError('debug state patch must be an object');
  }
  store.setState(patch);
  return store.getState();
}

function sceneUrl(scene, mode) {
  const url = new URL(window.location.href);
  url.searchParams.set('lqa', '1');
  url.searchParams.set('scene', scene);
  if (mode) url.searchParams.set('mode', mode);
  else url.searchParams.delete('mode');
  return url.href;
}

export function createDebugApi({ dev, game, config, locale, scene, scenes }) {
  const devActions = [
    'setShowCollisionBodies',
    'setShowFps',
    'setInfiniteEnergy',
    'setGamepadLayout',
    'playSkillPreview',
    'clearSkillPreview',
    'setSkipLoading',
    'setSkipTutorial'
  ];
  const gameActions = [
    'start',
    'addScore',
    'onMerge',
    'setQueue',
    'advanceQueue',
    'spendEnergy',
    'consumeSwapCharge',
    'addEnergy',
    'tickEnergyDecay',
    'refreshEnergyDecayTiming',
    'setSkillSession',
    'incSkillUse',
    'setState',
    'commitHighScore',
    'hydrateProfile',
    'setPaused'
  ];
  const configActions = ['set', 'setDensityToWind', 'resetAll', 'copyAsCode'];

  return Object.freeze({
    version: 1,
    languages: Object.freeze([...LANGUAGE_CODES]),
    lqa: Object.freeze({
      enabled: () => new URLSearchParams(window.location.search).get('lqa') === '1',
      scenes: Object.freeze(scenes.map(({ id, title }) => Object.freeze({
        id,
        title,
        url: mode => sceneUrl(id, mode)
      }))),
      open: (id, mode) => {
        window.location.assign(sceneUrl(id, mode));
      }
    }),
    dev: Object.freeze({
      ...storeApi(dev),
      ...actions(dev, devActions)
    }),
    game: Object.freeze({
      ...storeApi(game),
      ...actions(game, gameActions),
      setScore: score => patchState(game, { score: Number(score) }),
      setEnergy: energy => patchState(game, { energy: Number(energy) }),
      setHighScore: highScore => patchState(game, { highScore: Number(highScore) }),
      patch: patch => patchState(game, patch)
    }),
    config: Object.freeze({
      ...storeApi(config),
      ...actions(config, configActions)
    }),
    locale: Object.freeze({
      ...storeApi(locale),
      get: () => locale.getState().lang,
      reload: language => {
        if (!LANGUAGE_CODES.includes(language)) {
          throw new Error(`Unsupported language: ${language}`);
        }
        const url = new URL(window.location.href);
        url.searchParams.set('lang', language);
        window.location.assign(url.href);
      }
    }),
    scene: Object.freeze({
      ...storeApi(scene),
      get: () => scene.getState().globalScene,
      set: value => scene.getState().setGlobalScene(value)
    })
  });
}
