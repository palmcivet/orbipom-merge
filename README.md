# 融合！山团团！

静态站点，运行已归档的原版前端 `v1d5-synthesize-tuantuan-web@1.1.2`，并固定 `hg-web-sdk@3.0.3`。构建时把第三方地址改写到站内快照，不在打开页面时向 CDN 拉取脚本、图片、字体或音频。

这是爱好者离线整理，不是鹰角网络或《明日方舟：终末地》的官方发行。角色、图像、音乐、字体、标识和原版代码的权利归原权利人所有。站点内首页有完整的免费游玩说明与免责声明。

## 来源与感谢

本站整理自 [Crowning洛凡](https://space.bilibili.com/51211646) 的免费分享：[【终末地/免费分享】融合山团团离线版 不涉及任何话题活动和盈利](https://www.bilibili.com/video/BV1ByH86gEXZ/)。

## 免责声明

- 本站不是官方产品，也不代表原分享作者为本站背书。原视频写明免费分享、允许转载，且不涉及话题活动和盈利；本站不收费、不发官方奖励、不把成绩提交给官方。
- 原生素材的权利不因免费提供或转载许可而转移。请勿以本站牟利、转售或冒充官方。
- 页面按现状提供。存档只在当前浏览器，换浏览器、清理站点数据或更换地址可能导致记录无法读取。
- 本说明是使用与风险告知，不排除依法不能排除的责任，也不构成对素材再分发的授权。权利异议请联系站点维护者。

## 本地预览

```bash
pnpm install
pnpm build
pnpm preview
```

浏览器打开 `http://127.0.0.1:4173/`。首页进入游戏；分数和图鉴保存在当前浏览器，F10 可导出或导入存档。

`ORBIPOM_BASE_PATH` 默认为 `/`。部署到 `https://<user>.github.io/<repo>/` 时要设成 `/<repo>`，否则绝对路径会指到用户站点根目录。

## GitHub Pages

仓库 Settings → Pages → Build and deployment 选择 **GitHub Actions**。不要改成从分支部署：图片、音频和字体在 Git LFS 里，分支部署会把 LFS 指针原文发到网站上。

推送到 `main` 后，[`.github/workflows/pages.yml`](.github/workflows/pages.yml) 会先用 `lfs: true` 检出真实文件，再用 Pages 的 `base_path` 构建 `dist/` 并发布。访问者拿到的是构建产物里的文件内容，不需要安装 Git LFS。构建只校验 `vendor/snapshot.json`，不会重新下载 CDN。

提交 `vendor/` 里的 png、jpg、mp3、woff、woff2、ttf、ico 前要安装 Git LFS。脚本、样式、SVG 和 `snapshot.json` 仍在普通 Git 里。

## 快照

`vendor/original/` 是原版发布包。`vendor/hg-web-sdk/3.0.3/` 是锁定的 Web SDK，入口 `vendor/hg-web-sdk/sdk.entry.js` 只加载这一版，不请求灰度配置，也不加缓存破坏参数。登录、遥测和奖励接口保持禁用。

更新快照时运行 `pnpm update`，核对 `vendor/snapshot.json` 后再提交。日常构建如果哈希对不上会直接失败。

## 操作

| 操作 | 方式 |
| --- | --- |
| 瞄准 | 在投放区域移动鼠标 |
| 投放 | 点击投放区域，或按空格 |
| 舍弃 / 协议·漂浮 / 摇晃！ / 命定互换 | 获得对应技力后使用原版战技 |
| 规则、成绩、音乐、重开 | 右上方原版按钮 |
| 存档 | F10，或左下角「本地离线」 |

原版编译代码和视听资源保留其原有权利标识。
