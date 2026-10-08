import type { Language } from '@koiro/shared';

/**
 * 歌词字体：含日语时优先用日文字体；否则普通话、粤语、闽南语或英语歌词
 * 按字符回退：Source Serif 4 排拉丁字符，霞鹜文楷 TC 排汉字。
 * 其他语言返回 undefined，由调用方决定默认字体。
 */
export function lyricsFontFamily(
  languages: readonly Language[],
): string | undefined {
  if (languages.includes('ja')) {
    return 'var(--font-jp-sans), var(--font-jp-serif), "Noto Sans SC", "Noto Serif SC", sans-serif';
  }
  if (
    languages.some((language) => ['zh', 'yue', 'nan', 'en'].includes(language))
  ) {
    return 'var(--font-lyrics-en), var(--font-lyrics-zh), var(--font-display), "Noto Serif SC", serif';
  }
  return undefined;
}
