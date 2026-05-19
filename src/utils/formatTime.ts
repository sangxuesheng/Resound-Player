/**
 * 将秒数格式化为 m:ss 显示字符串
 *
 * @param sec - 秒数
 * @returns 格式化后的字符串，如 "3:05"
 */
export function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}