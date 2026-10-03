import type { Language } from './generated/api';

/**
 * 语种的显示名称，顺序即界面上的顺序。
 * `satisfies` 要求键恰好覆盖服务端定义的全部语种：服务端增删语种时这里会报错。
 */
export const LANGUAGE_NAMES = {
  zh: '普通话',
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  yue: '粵語',
  nan: '閩南語',
} as const satisfies Record<Language, string>;

export const LANGUAGES = Object.keys(LANGUAGE_NAMES) as Language[];

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as string[]).includes(value);
}

/** 显示用：不认识的代码原样返回 */
export function languageName(code: string): string {
  return isLanguage(code) ? LANGUAGE_NAMES[code] : code;
}
