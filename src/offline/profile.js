export const LIMITS = {
  score: 99999,
  nickname: 24,
  unlockMin: 5,
  unlockMax: 11,
  history: 100
};

const CLAIMED_TASKS = new Set(['merge', 'skill', 'highScore', 'share', 'goldenAdmin']);

function boundedInteger(value, maximum, fallback = 0) {
  return Number.isFinite(value) ? Math.min(maximum, Math.max(0, Math.floor(value))) : fallback;
}

function nicknameOf(value) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, LIMITS.nickname) : '本地管理员';
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-LIMITS.history).filter(record => record && Number.isFinite(record.score)).map(record => ({
    score: boundedInteger(record.score, LIMITS.score),
    at: typeof record.at === 'string' ? record.at : '',
    merges: boundedInteger(record.merges, Number.MAX_SAFE_INTEGER),
    skills: boundedInteger(record.skills, Number.MAX_SAFE_INTEGER)
  }));
}

export function emptyProfile() {
  return {
    schema: 1,
    nickname: '本地管理员',
    highScore: 0,
    submittedBest: 0,
    unlockedMax: LIMITS.unlockMin,
    guideDone: false,
    mergeCountTotal: 0,
    skillUseTotal: 0,
    shared: false,
    claimed: [],
    history: [],
    updatedAt: null
  };
}

export function normalizeProfile(value) {
  if (!value || value.schema !== 1) throw new Error('不支持的存档格式');
  return {
    schema: 1,
    nickname: nicknameOf(value.nickname),
    highScore: boundedInteger(value.highScore, LIMITS.score),
    submittedBest: boundedInteger(value.submittedBest, LIMITS.score),
    unlockedMax: Math.max(LIMITS.unlockMin, boundedInteger(value.unlockedMax, LIMITS.unlockMax, LIMITS.unlockMin)),
    guideDone: value.guideDone === true,
    mergeCountTotal: boundedInteger(value.mergeCountTotal, Number.MAX_SAFE_INTEGER),
    skillUseTotal: boundedInteger(value.skillUseTotal, Number.MAX_SAFE_INTEGER),
    shared: value.shared === true,
    claimed: Array.isArray(value.claimed) ? [...new Set(value.claimed.filter(taskId => CLAIMED_TASKS.has(taskId)))] : [],
    history: normalizeHistory(value.history),
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : null
  };
}

export { boundedInteger };
