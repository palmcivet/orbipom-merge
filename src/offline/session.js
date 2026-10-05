function lqaScenePreview() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('lqa') === '1' && Boolean(params.get('scene'));
  } catch {
    return false;
  }
}

export function createGameSession() {
  let stores = null;

  return {
    connect(nextStores, profiles) {
      stores = nextStores;
      stores.game.subscribe((current, previous) => {
        if (lqaScenePreview()) return;
        const profile = profiles.current();
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
        if (changed) profiles.persist();
      });
    },
    currentGame() {
      return stores ? stores.game.getState() : null;
    },
    pause() {
      const wasPaused = stores ? stores.game.getState().paused : false;
      if (stores) stores.game.getState().setPaused(true);
      return wasPaused;
    },
    resume(wasPaused) {
      if (stores) stores.game.getState().setPaused(wasPaused);
    },
    applyNickname(nickname) {
      if (!stores) return;
      const data = stores.data.getState();
      data.setUserInfo({ ...data.userInfo, nickname });
    }
  };
}
