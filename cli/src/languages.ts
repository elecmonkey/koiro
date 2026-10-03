import { LANGUAGES, LANGUAGE_NAMES } from '@koiro/shared';

/** 给人和 agent 看的语种列表，如 `zh 普通话, en English, ...` */
export const languageList = LANGUAGES.map(
  (code) => `${code} ${LANGUAGE_NAMES[code]}`,
).join(', ');
