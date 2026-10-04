import { LIMITS, boundedInteger } from './profile.js';

function success(data) {
  return Promise.resolve({ code: 0, msg: 'success', data });
}

export function createOfflineApi({ profiles, session }) {
  return {
    user: {
      requestLogin: () => success(null),
      requestSyncRole: () => {
        const profile = profiles.current();
        return success({ roleId: 'offline-local', serverId: 'offline', uid: 'LOCAL', nickname: profile.nickname, avatar: null });
      }
    },
    game: {
      requestGameProfile: () => {
        const profile = profiles.current();
        return success({ highScore: profile.highScore, unlockedMax: profile.unlockedMax, guideDone: profile.guideDone });
      },
      requestMarkGuide: () => {
        profiles.current().guideDone = true;
        profiles.persistNow();
        return success(null);
      },
      requestRecordMerge: level => {
        const profile = profiles.current();
        profile.unlockedMax = Math.max(profile.unlockedMax, boundedInteger(level, LIMITS.unlockMax));
        profiles.persist();
        return success({ mergeCountTotal: profile.mergeCountTotal, unlockedMax: profile.unlockedMax });
      },
      requestRecordSkill: () => success({ skillUseTotal: profiles.current().skillUseTotal }),
      requestSubmitScore: ({ score }) => {
        const profile = profiles.current();
        const normalizedScore = boundedInteger(score, LIMITS.score);
        const isNewBest = normalizedScore > profile.submittedBest;
        profile.submittedBest = Math.max(profile.submittedBest, normalizedScore);
        profile.highScore = Math.max(profile.highScore, normalizedScore);
        const game = session.currentGame();
        profile.history.push({
          score: normalizedScore,
          at: new Date().toISOString(),
          merges: game ? game.mergeCount : 0,
          skills: game ? game.skillUseCount : 0
        });
        profile.history = profile.history.slice(-LIMITS.history);
        profiles.persistNow();
        return success({ best: profile.highScore, isNewBest });
      }
    },
    leaderboard: {
      requestLeaderboard: () => {
        const profile = profiles.current();
        const self = { rank: 1, nickname: profile.nickname, avatar: null, score: profile.highScore, isNpc: false };
        return success({ list: [self], self });
      }
    },
    reward: {
      getReward: () => success({ tasks: [], claimableCount: 0 }),
      claim: () => Promise.resolve({ code: -1, msg: '挑战与礼物功能已移除', data: null }),
      claimAll: () => success({ results: [] }),
      share: () => {
        profiles.current().shared = true;
        profiles.persistNow();
        return success(null);
      }
    }
  };
}
