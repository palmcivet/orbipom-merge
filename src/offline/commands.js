import { chooseJsonFile, downloadFile } from './files.js';
import { restartPlay } from './navigation.js';
import { LIMITS, emptyProfile } from './profile.js';
import { SAVE_FILE_LIMIT, parseSave, serializeSave } from './save.js';

export function createSaveCommands({ profiles, session }) {
  function commitAndRestart(message, reset) {
    if (!window.confirm(message)) return;
    reset();
    profiles.persistNow();
    restartPlay();
  }

  return {
    exportSave() {
      profiles.persistNow();
      const url = URL.createObjectURL(new Blob([serializeSave(profiles.current())], { type: 'application/json' }));
      downloadFile(url, `山团团-本地存档-${new Date().toISOString().slice(0, 10)}.json`);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    },
    async importSave() {
      try {
        const file = await chooseJsonFile();
        if (!file) return;
        if (file.size > SAVE_FILE_LIMIT) throw new Error('存档文件过大');
        const imported = parseSave(await file.text());
        if (!window.confirm('导入将替换当前本地记录并重新开始一局，继续吗？')) return;
        profiles.replace(imported);
        profiles.persistNow();
        window.location.reload();
      } catch (error) {
        window.alert(`导入失败：${error.message}`);
      }
    },
    rename(nickname) {
      const next = nickname.trim().slice(0, LIMITS.nickname);
      if (!next) return;
      const profile = profiles.current();
      profile.nickname = next;
      profiles.persistNow();
      session.applyNickname(profile.nickname);
    },
    replayGuide() {
      commitAndRestart('重看引导会开始新的一局，继续吗？', () => {
        profiles.current().guideDone = false;
      });
    },
    clearProfile() {
      commitAndRestart('清空所有本地分数、图鉴和对局记录？建议先导出备份。', () => {
        profiles.replace(emptyProfile());
      });
    }
  };
}
