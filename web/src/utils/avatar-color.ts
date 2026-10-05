/** 没有头像时按 ID 固定分配的底色，和站点配色协调，避免清一色灰圆 */
const PALETTE = [
  '#2d6b5f', // 茶绿（主色）
  '#8b5b3b', // 赭棕（辅色）
  '#6b5b8f', // 灰紫
  '#c0783c', // 橙赭
  '#4a6670', // 蓝灰
  '#8a6d3b', // 橄榄金
  '#a4555c', // 玫瑰棕
  '#4b7a5e', // 深绿
];

export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
