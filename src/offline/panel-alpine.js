import Alpine from '@alpinejs/csp';
import { activeWorker, askLoadStatus, loadLabel, readLoadReport, writeLoadReport } from '../pwa/load-status.js';
import { LIMITS } from './profile.js';

const tabs = [
  ['save', '本地记录'],
  ['game', '对局调试'],
  ['physics', '物理参数'],
  ['lqa', 'LQA 场景']
];

Alpine.data('offlineLanding', () => ({
  infoOpen: false,
  toggleInfo() {
    this.infoOpen = !this.infoOpen;
  },
  closeInfo() {
    this.infoOpen = false;
  }
}));

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function snapshot(debug) {
  if (!debug) return {};
  return {
    dev: { ...debug.dev.getState() },
    game: { ...debug.game.getState() },
    config: { ...debug.config.getState() },
    locale: debug.locale.get(),
    scene: debug.scene.get()
  };
}

function panelMarkup() {
  return `
    <aside class="offline-panel" x-cloak x-show="open"
      @keydown.escape.window="close()" role="region" aria-labelledby="offline-panel-title">
        <header class="offline-panel-header">
          <div>
            <h2 id="offline-panel-title">本地存档与调试工具</h2>
          </div>
          <button class="offline-icon-button" type="button" @click="close()" aria-label="关闭面板">×</button>
        </header>
        <nav class="offline-tabs" aria-label="工具分类">
          ${tabs.map(([id, label]) => `<button type="button" :class="{active: tab === '${id}'}" @click="selectTab('${id}')" :aria-selected="tab === '${id}'">${label}</button>`).join('')}
        </nav>
        <main class="offline-panel-content">
          <section x-show="tab === 'save'" x-cloak>
            <p class="offline-section-intro">存档只保存在当前浏览器。导出一份备份，换设备前记得带走。</p>
            <div class="offline-stat-line">
              <span>最高分 <strong x-text="status.highScore"></strong></span>
              <span>累计合成 <strong x-text="status.mergeCountTotal"></strong></span>
              <span>图鉴 <strong x-text="status.unlockedMax + '/11'"></strong></span>
            </div>
            <div class="offline-action-grid">
              <button type="button" @click="commands.exportSave()">导出存档</button>
              <button type="button" @click="commands.importSave()">导入存档</button>
              <button type="button" @click="rename()">修改昵称</button>
              <button type="button" @click="commands.replayGuide()">重看引导</button>
              <button class="danger" type="button" @click="commands.clearProfile()">清空记录</button>
            </div>
            <details class="offline-details" x-show="status.history.length">
              <summary>最近本地结算</summary>
              <ol>
                <template x-for="record in status.history.slice().reverse().slice(0, 10)" :key="record.at">
                  <li><span x-text="record.score + ' 分 · ' + record.merges + ' 次合成 · ' + record.skills + ' 次战技'"></span><small x-text="record.at.replace('T', ' ').slice(0, 19)"></small></li>
                </template>
              </ol>
            </details>
          </section>

          <section x-show="tab === 'game'" x-cloak>
            <template x-if="!debug">
              <p class="offline-empty">进入游戏后可用。当前页面没有原版对局状态。</p>
            </template>
            <template x-if="debug">
              <div>
                <div class="offline-debug-grid">
                  <label>当前分数<input type="number" x-model.number="game.score" @change="setGame('setScore', game.score)"></label>
                  <label>最高分<input type="number" x-model.number="game.highScore" @change="setGame('setHighScore', game.highScore)"></label>
                  <label>技力<input type="number" min="0" max="3" x-model.number="game.energy" @change="setGame('setEnergy', game.energy)"></label>
                  <label>状态<select x-model="game.state" @change="setGame('setState', game.state)"><option value="idle">idle</option><option value="playing">playing</option><option value="result">result</option></select></label>
                </div>
                <div class="offline-switches">
                  <label><input type="checkbox" x-model="dev.infiniteEnergy" @change="setDev('setInfiniteEnergy', dev.infiniteEnergy)"> 无限技力</label>
                  <label><input type="checkbox" x-model="dev.showCollisionBodies" @change="setDev('setShowCollisionBodies', dev.showCollisionBodies)"> 显示碰撞体</label>
                  <label><input type="checkbox" x-model="dev.showFps" @change="setDev('setShowFps', dev.showFps)"> 显示帧率</label>
                  <label><input type="checkbox" x-model="dev.skipTutorial" @change="setDev('setSkipTutorial', dev.skipTutorial)"> 跳过教程</label>
                </div>
                <div class="offline-action-grid compact">
                  <button type="button" @click="fillEnergy()">补满技力</button>
                  <button type="button" @click="setDev('playSkillPreview', 'clear')">预览舍弃</button>
                  <button type="button" @click="setDev('playSkillPreview', 'wind')">预览漂浮</button>
                  <button type="button" @click="setDev('playSkillPreview', 'shake')">预览摇晃</button>
                  <button type="button" @click="setDev('playSkillPreview', 'swap')">预览互换</button>
                </div>
              </div>
            </template>
          </section>

          <section x-show="tab === 'physics'" x-cloak>
            <template x-if="!debug">
              <p class="offline-empty">进入游戏后可用。当前页面没有物理参数状态。</p>
            </template>
            <template x-if="debug">
              <div>
                <p class="offline-section-intro">参数实时作用于当前对局。数值范围沿用官方调试工具。</p>
                <div class="offline-debug-grid">
                  <label>重力<input type="number" step="0.05" x-model.number="physics.gravityY" @change="setConfig('gravityY', physics.gravityY)"></label>
                  <label>团团缩放<input type="number" step="0.05" x-model.number="physics.tuanScale" @change="setConfig('tuanScale', physics.tuanScale)"></label>
                  <label>摩擦力<input type="number" step="0.1" x-model.number="physics['body.friction']" @change="setConfig('body.friction', physics['body.friction'])"></label>
                  <label>空气阻力<input type="number" step="0.001" x-model.number="physics['body.frictionAir']" @change="setConfig('body.frictionAir', physics['body.frictionAir'])"></label>
                  <label>摇晃力度<input type="number" step="0.001" x-model.number="physics.shakeForce" @change="setConfig('shakeForce', physics.shakeForce)"></label>
                  <label>红线 Y<input type="number" step="1" x-model.number="physics.redLineY" @change="setConfig('redLineY', physics.redLineY)"></label>
                </div>
                <div class="offline-action-grid compact">
                  <button type="button" @click="resetConfig()">恢复官方默认</button>
                  <button type="button" @click="copyConfig()">复制配置代码</button>
                </div>
              </div>
            </template>
          </section>

          <section x-show="tab === 'lqa'" x-cloak>
            <p class="offline-section-intro">打开官方预留的验收场景。场景页使用固定演示数据，不会写入本地记录。</p>
            <div class="offline-lqa-toolbar">
              <label>文案模式<select x-model="lqaMode"><option value="">正常文案</option><option value="key">显示文案键</option></select></label>
              <button type="button" @click="openLqa('home-default')">主界面</button>
            </div>
            <div class="offline-scene-list">
              <template x-for="item in scenes" :key="item.id">
                <button type="button" @click="openLqa(item.id)"><span x-text="item.title"></span><small x-text="item.id"></small></button>
              </template>
            </div>
          </section>
        </main>
        <footer class="offline-panel-footer">
          <span class="offline-panel-status" x-text="footerText"></span>
          <button type="button" @click="close()">关闭</button>
        </footer>
    </aside>`;
}

function data({ readStatus, commands }) {
  return {
    open: false,
    tab: 'save',
    tabLabels: tabs,
    commands,
    status: readStatus(),
    debug: null,
    dev: {},
    game: {},
    physics: {},
    scenes: [],
    lqaMode: '',
    loadText: '',
    footerText: '本地存档模式',
    init() {
      this.refresh();
      for (const key of ['dev', 'game', 'config']) {
        this.subscribe(this.getDebugStore(key));
      }
    },
    getDebugStore(key) {
      return window.orbipom?.debug?.[key];
    },
    subscribe(store) {
      if (store) store.subscribe(() => this.refresh());
    },
    refresh() {
      this.status = readStatus();
      this.debug = window.orbipom?.debug || null;
      if (!this.debug) {
        this.dev = {};
        this.game = {};
        this.physics = {};
        this.scenes = [];
        this.syncFooter();
        return;
      }
      const current = snapshot(this.debug);
      this.dev = current.dev;
      this.game = current.game;
      this.physics = current.config.values || {};
      this.scenes = this.debug.lqa.scenes;
      this.syncFooter();
    },
    syncFooter() {
      const base = this.debug ? '原版调试接口已连接' : '本地存档模式';
      this.footerText = this.loadText ? `${base} · ${this.loadText}` : base;
    },
    async refreshLoad() {
      const stored = readLoadReport();
      if (stored) {
        this.loadText = loadLabel(stored);
        this.syncFooter();
      }
      const live = await askLoadStatus(await activeWorker());
      if (!live?.counts) return;
      writeLoadReport(live);
      this.loadText = loadLabel(live);
      this.syncFooter();
    },
    show() {
      this.refresh();
      this.open = true;
      this.refreshLoad();
    },
    selectTab(tab) {
      this.tab = tab;
      this.refresh();
    },
    close() {
      if (!this.open) return;
      this.open = false;
    },
    rename() {
      const nickname = window.prompt(`本地排行榜昵称（最多 ${LIMITS.nickname} 字）`, this.status.nickname);
      if (nickname?.trim()) {
        commands.rename(nickname);
        this.refresh();
      }
    },
    setDev(action, value) {
      const handler = this.debug?.dev?.[action];
      if (typeof handler !== 'function') return;
      handler(value);
      this.refresh();
    },
    setGame(action, value) {
      const handler = this.debug?.game?.[action];
      if (typeof handler !== 'function') return;
      handler(value);
      this.refresh();
    },
    setConfig(key, value) {
      if (typeof this.debug?.config?.set !== 'function') return;
      this.debug.config.set(key, finite(value));
      this.refresh();
    },
    fillEnergy() {
      this.setGame('addEnergy', 3);
    },
    resetConfig() {
      if (typeof this.debug?.config?.resetAll !== 'function') return;
      this.debug.config.resetAll();
      this.refresh();
    },
    copyConfig() {
      const code = this.debug?.config.copyAsCode();
      if (code) navigator.clipboard?.writeText(code);
    },
    openLqa(id) {
      this.debug?.lqa.open(id, this.lqaMode);
    }
  };
}

export function createSavePanel(options) {
  let app;
  function mount() {
    const root = document.createElement('div');
    root.id = 'orbipom-offline-tools';
    root.innerHTML = panelMarkup();
    document.body.appendChild(root);
    const state = data(options);
    Alpine.data('orbipomPanel', () => state);
    root.setAttribute('x-data', 'orbipomPanel');
    Alpine.initTree(root);
    app = Alpine.$data(root);
  }
  function toggle() {
    if (!app) mount();
    app.open ? app.close() : app.show();
  }
  return { toggle, close: () => app?.close() };
}

export function mountLanding() {
  document.addEventListener('DOMContentLoaded', () => {
    const landing = document.querySelector('[x-data="offlineLanding"]');
    if (landing) Alpine.initTree(document.body);
  });
}
