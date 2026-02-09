export const LANGUAGE_NAMES: Record<string, string> = {
  zh: "普通话",
  en: "English",
  ja: "日本語",
  ko: "한국어",
  yue: "粵語",
  nan: "閩南語",
};

export function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] || code;
}

export const SUPPORTED_LANGUAGE_CODES = Object.keys(LANGUAGE_NAMES);
