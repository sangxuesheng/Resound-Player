/**
 * 音质选项常量 — 在所有音质选择器中保持一致
 *
 * label: 显示名称
 * level: API level 参数值
 * vip:  所需 VIP 等级描述（空字符串表示免费可用）
 */
export const QUALITY_OPTIONS = [
  { label: '标准', level: 'standard', vip: '' },
  { label: '较高', level: 'higher', vip: '' },
  { label: '极高(HQ)', level: 'exhigh', vip: '' },
  { label: '无损(SQ)', level: 'lossless', vip: '黑胶VIP' },
  { label: 'Hi-Res', level: 'hires', vip: '黑胶VIP' },
  { label: '高清臻音', level: 'jyeffect', vip: 'SVIP' },
  { label: '沉浸环绕声', level: 'sky', vip: 'SVIP' },
  { label: '杜比全景声', level: 'dolby', vip: 'SVIP' },
  { label: '超清母带', level: 'jymaster', vip: 'SVIP' },
] as const;

/** 需要 VIP 才能使用的音质 level */
export const VIP_ONLY_LEVELS = new Set([
  'lossless', 'hires', 'jyeffect', 'sky', 'dolby', 'jymaster',
]);

/**
 * 判断指定音质对当前用户是否可用
 *
 * @param level - 音质 level 值
 * @param isRelogin - 是否真实登录（cookie 或扫码）
 * @param isVip - 是否为 VIP 用户
 */
export function isQualityAvailable(level: string, isRelogin: boolean, isVip: boolean): boolean {
  if (isRelogin && isVip) return true;
  return !VIP_ONLY_LEVELS.has(level);
}