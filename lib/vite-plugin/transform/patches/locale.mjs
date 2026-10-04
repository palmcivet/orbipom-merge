import { PATCH_TARGETS } from '../../../config.mjs';
import { replaceOnce } from '../replace.mjs';
import { rewriteAssetUrls } from '../urls.mjs';

const file = PATCH_TARGETS.locale;
const wording = [
  ['title-local', '"title":"排行榜"', '"title":"本地排行榜"'],
  ['tasks-local', '"title":"任务奖励"', '"title":"本地挑战"'],
  ['mail-local', '"mail_sent":"已发送至游戏内邮箱"', '"mail_sent":"已记录至本地（非官方奖励）"'],
  ['join-offline', '"join_desc":"活动中心解锁后"', '"join_desc":"离线游玩，无需官方账号"'],
  ['notice-leaderboard', '"notice_1":"活动期间，系统将根据管理员过往游玩过程中的历史最高分与好友们进行排名，前25名会在排行榜上展示。"', '"notice_1":"排行榜只展示当前浏览器的本地最高分；不会上传成绩或读取官方好友数据。"'],
  ['notice-rewards', '"notice_2":"完成任务并领取奖励后，奖励将通过游戏内邮件发放。邮件有效期为30天，请及时领取。"', '"notice_2":"本版本不包含挑战、礼物领取或官方奖励。最高分和图鉴保存在当前浏览器，F10 可导入、导出存档。"'],
  ['play-local', '"play_desc":"管理员通过融合相同的山团团，找到更大的山团团并获得积分，领取丰厚奖励。"', '"play_desc":"管理员通过融合相同的山团团，找到更大的山团团并获得积分，挑战自己的最高纪录。"']
];

export function patchLocale(source, context) {
  let patched = source;
  for (const [patch, needle, replacement] of wording) {
    patched = replaceOnce(patched, needle, replacement, { file, patch });
  }
  return rewriteAssetUrls(patched, context);
}
