import type { Language } from '@koiro/shared';

/**
 * 歌词字体：含日语时用日文字体（它也能排夹杂的英文）；否则含英语时用英文衬线体，
 * 中文部分落到同源的思源宋体。都不是时返回 undefined，由调用方决定默认字体
 */
export function lyricsFontFamily(
  languages: readonly Language[],
): string | undefined {
  if (languages.includes('ja')) {
    return 'var(--font-jp-sans), var(--font-jp-serif), "Noto Sans SC", "Noto Serif SC", sans-serif';
  }
  if (languages.includes('en')) {
    return 'var(--font-lyrics-en), var(--font-display), "Noto Serif SC", serif';
  }
  return undefined;
}
