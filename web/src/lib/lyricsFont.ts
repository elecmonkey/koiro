import type { Language } from '@koiro/shared';

/** 含日语的歌词优先用日文字体；其他情况返回 undefined，由调用方决定默认字体 */
export function lyricsFontFamily(
  languages: readonly Language[],
): string | undefined {
  return languages.includes('ja')
    ? 'var(--font-jp-sans), var(--font-jp-serif), "Noto Sans SC", "Noto Serif SC", sans-serif'
    : undefined;
}
