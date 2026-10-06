<h1>融合！山团团！</h1>

[![部署](https://img.shields.io/github/deployments/palmcivet/orbipom-merge/github-pages?style=for-the-badge&logo=github&logoColor=white&label=deploy)](https://github.com/palmcivet/orbipom-merge/actions/workflows/pages.yml)[![PWA](https://img.shields.io/badge/PWA-5a0fc8?style=for-the-badge&logo=pwa&logoColor=white)](https://palmcivet.github.io/orbipom-merge/)[![在线地址](https://img.shields.io/badge/在线地址-0969da?style=for-the-badge&logo=githubpages&logoColor=white)](https://palmcivet.github.io/orbipom-merge/)

- [界面](#界面)
  - [主页](#主页)
  - [手柄](#手柄)
- [来源与感谢](#来源与感谢)
- [免责声明](#免责声明)
- [资源](#资源)
  - [官方素材](#官方素材)
  - [附加页面](#附加页面)
  - [更新快照](#更新快照)
  - [构建产物](#构建产物)
- [本地开发](#本地开发)
- [本地预览](#本地预览)
- [在线部署](#在线部署)

《明日方舟：终末地》「融合！山团团！」网页活动资源提取。这是社区整理，角色、图像、音乐、字体、标识和原版代码的权利归鹰角网络所有。

## 界面

### 主页

![主页](assets/screenshot-home.webp)

入口页沿用官方主视觉。右下角可以打开活动说明，或进入游戏。

### 手柄

![手柄操作](assets/screenshot-stick.webp)

官方网页支持手柄。接上 Xbox 或 PlayStation 手柄后按任意键，页面会切到手柄操作，并显示对应按键图标。移动鼠标或按键盘会回到鼠标操作。网页里的战技固定用方向键，不使用肩键。

## 来源与感谢

本项目整理自 [Crowning洛凡](https://space.bilibili.com/51211646) 的分享：[【终末地/免费分享】融合山团团离线版 不涉及任何话题活动和盈利](https://www.bilibili.com/video/BV1ByH86gEXZ/)。基于原始的材料，做了一些优化。本仓库已对资源进行归档，官方活动下线后也能照常游玩，见 [资源](#资源)。

其他项目：[融合！山团团！本地化展示，内置修改菜单](https://www.bilibili.com/video/BV1RWHL6tESE)，开源在 [GitHub](https://github.com/Escosis/Localized-Websites/tree/main/EF-OrbiPom-MERGE)

## 免责声明

- 本项目不是官方产品，不涉及话题活动和盈利，不收费、不发官方奖励、不把成绩提交给官方。
- 原生素材的权利不因免费提供或转载许可而转移。请勿以本站牟利、转售或冒充官方。
- 页面按现状提供。存档只在当前浏览器，换浏览器、清理站点数据或更换地址可能导致记录无法读取。

## 资源

### 官方素材

官方素材放在 `vendor/`，站点使用构建产物部署。原版前端是 `v1d5-synthesize-tuantuan-web@1.1.2`。

`vendor/original/` 是原版发布包，即官方的原版玩法。

### 附加页面

`src/` 是附加页面，负责入口、PWA 和资源加载。

- `src/play/` 等服务工作线程就绪后打开游戏页。
- `src/sw.js` 拦截同站的图片、音频、字体和 React 请求，决定向官方 CDN 还是本站要文件。

这些资源优先向鹰角网络 CDN 请求。服务工作线程安装时会探测官方地址。探测失败，或某个文件超时、打不开时，改从本站同名文件下载。取到的文件写入本机缓存，之后离线也能打开已经加载过的页面和资源。安装时只预缓存页面、脚本、样式和图标，不预先下载整包素材。

改过的游戏脚本、入口、文案、离线适配和遥测屏蔽始终用本站文件。登录、成绩和奖励接口保持禁用。

本项目支持 PWA，安装后可纯离线使用。

### 更新快照

快照记录每个文件的路径、来源地址、字节数和 sha256。原版站点文件的来源地址沿用上一份快照。

`pnpm fetch` 从官方 CDN 同步资源，并重写 `vendor/snapshot.json`。

构建时只按这份快照校验。发布版本或哈希对不上，清单和 `vendor/` 不一致，或二进制仍是 Git LFS 指针时，构建直接失败。构建期间不访问 CDN。

提交 `vendor/` 里的静态资源要安装 Git LFS。脚本、样式、SVG 和 `snapshot.json` 仍在普通 Git 里。

### 构建产物

`pnpm build` 把 `vendor/` 和 `src/` 编译成 `dist/`。GitHub Pages 部署的就是这个目录。

Vite 构建两个附加页面：首页，以及进入游戏前的等待页，并生成服务工作线程、Web App 清单和图标。等待页先等服务工作线程就绪，再进入游戏。

1. 校验 `vendor/snapshot.json`，再构建 CDN 对照表，把本站路径对应到官方来源；
2. 把 `vendor/` 写入产物。脚本、样式、SVG 和 HTML 里的官方地址改写成本站路径；
3. 其余文件原样复制，图片、音频和字体留在产物里，供官方资源下线时由本站提供；
1. 构建结束会扫描产物，确认官方资源地址已经改写完毕。

运行时由服务工作线程决定这些本站地址要不要改向官方 CDN。

游戏脚本改为本地存档并去掉奖励入口，入口接到离线 SDK，文案改成离线说明。原版 `official-index.html` 渲染成 `play/game.html`，挂上内容安全策略、清单和离线运行时。遥测地址换成空实现。

## 本地开发

```bash
pnpm install
pnpm dev
```

浏览器打开 `http://127.0.0.1:5173/`。

## 本地预览

要预览和 Pages 一样的构建结果：

```bash
pnpm build
pnpm preview
```

浏览器打开 `http://127.0.0.1:4173/`。首页进入游戏；分数和图鉴保存在当前浏览器，F10 可导出或导入存档。

## 在线部署

`ORBIPOM_BASE_PATH` 默认为 `/`。部署到 `https://<user>.github.io/<repo>/` 时要设成 `/<repo>`，否则绝对路径会指到用户站点根目录。
