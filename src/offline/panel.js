import { LIMITS } from './profile.js';

const HISTORY_PREVIEW = 10;

function appendHistory(panel, history) {
  if (!history.length) return;
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = '最近的本地结算';
  const list = document.createElement('ol');
  for (const record of history.slice(-HISTORY_PREVIEW).reverse()) {
    const item = document.createElement('li');
    item.textContent = `${record.score} 分 · ${record.merges} 次合成 · ${record.skills} 次战技 · ${record.at.replace('T', ' ').slice(0, 19)}`;
    list.appendChild(item);
  }
  details.append(summary, list);
  panel.appendChild(details);
}

export function createSavePanel({ readStatus, commands, pause, resume }) {
  let panel = null;

  function close() {
    if (!panel) return;
    const wasPaused = panel.dataset.wasPaused === 'true';
    panel.remove();
    panel = null;
    resume(wasPaused);
  }

  function open() {
    if (panel) {
      close();
      return;
    }
    const status = readStatus();
    panel = document.createElement('dialog');
    panel.id = 'orbipom-offline-panel';
    panel.dataset.wasPaused = String(pause());
    const heading = document.createElement('h2');
    heading.textContent = '山团团 · 本地离线版';
    const description = document.createElement('p');
    description.textContent = '保留原版玩法与视听资源。礼物和挑战入口已移除；仅记录本地分数、图鉴与对局进度。刷新会开始新的一局。';
    const summary = document.createElement('p');
    summary.textContent = `最高分 ${status.highScore} · 累计合成 ${status.mergeCountTotal} · 战技 ${status.skillUseTotal} · 图鉴 ${status.unlockedMax}/11${status.storageAvailable ? '' : ' · 存储不可用，请导出备份'}`;
    const actions = document.createElement('div');
    actions.className = 'offline-actions';
    const buttons = [
      ['导出存档', commands.exportSave],
      ['导入存档', commands.importSave],
      ['修改昵称', () => {
        const nickname = window.prompt(`本地排行榜昵称（最多 ${LIMITS.nickname} 字）`, status.nickname);
        if (!nickname || !nickname.trim()) return;
        commands.rename(nickname);
      }],
      ['重看新手引导', commands.replayGuide],
      ['清空本地记录', commands.clearProfile],
      ['继续游戏', close]
    ];
    for (const [label, handler] of buttons) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.onclick = handler;
      actions.appendChild(button);
    }
    panel.append(heading, description, summary, actions);
    appendHistory(panel, status.history);
    panel.addEventListener('cancel', event => {
      event.preventDefault();
      close();
    });
    document.body.appendChild(panel);
    panel.showModal();
  }

  return { toggle: open, close };
}

export function mountBadge(onClick) {
  document.addEventListener('DOMContentLoaded', () => {
    const badge = document.createElement('button');
    badge.id = 'orbipom-offline-badge';
    badge.type = 'button';
    badge.textContent = '本地离线 · F10';
    badge.title = '本地存档、备份和版本信息（F10）';
    badge.onclick = onClick;
    document.body.appendChild(badge);
  });
}
