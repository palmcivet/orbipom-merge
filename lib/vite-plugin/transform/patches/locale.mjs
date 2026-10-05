import { PATCH_TARGETS } from '../../../config.mjs';
import { replaceOnce } from '../replace.mjs';
import { rewriteAssetUrls } from '../urls.mjs';

const file = PATCH_TARGETS.locale;
const wording = [
  ['title-local', '"title":"排行榜"', '"title":"本地排行榜"'],
  ['tasks-local', '"title":"任务奖励"', '"title":"本地挑战"'],
  ['mail-local', '"mail_sent":"已发送至游戏内邮箱"', '"mail_sent":"已记录至本地（非官方奖励）"'],
  ['join-offline', '"join_desc":"活动中心解锁后"', '"join_desc":"本项目整理自 Crowning洛凡 的分享。基于原始的材料，做了一些优化。本仓库已对资源进行归档，官方活动下线后也能照常游玩。本项目不是官方产品，不涉及话题活动和盈利，不收费、不发官方奖励、不把成绩提交给官方。"'],
  ['notice-rights', '"notice_1":"活动期间，系统将根据管理员过往游玩过程中的历史最高分与好友们进行排名，前25名会在排行榜上展示。"', '"notice_1":"这是社区整理，角色、图像、音乐、字体、标识和原版代码的权利归鹰角网络所有。原生素材的权利不因免费提供或转载许可而转移。请勿以本站牟利、转售或冒充官方。"'],
  ['notice-save', '"notice_2":"完成任务并领取奖励后，奖励将通过游戏内邮件发放。邮件有效期为30天，请及时领取。"', '"notice_2":"页面按现状提供。存档只在当前浏览器，换浏览器、清理站点数据或更换地址可能导致记录无法读取。分数和图鉴保存在当前浏览器，F10 可导出或导入存档。"'],
  ['play-local', '"play_desc":"管理员通过融合相同的山团团，找到更大的山团团并获得积分，领取丰厚奖励。"', '"play_desc":"管理员通过融合相同的山团团，找到更大的山团团并获得积分。"']
];

export function patchLocale(source, context) {
  let patched = source;
  for (const [patch, needle, replacement] of wording) {
    patched = replaceOnce(patched, needle, replacement, { file, patch });
  }
  return rewriteAssetUrls(patched, context);
}
