import { isLanguage } from '@koiro/shared';
import type { SongFormData } from '@/components/song-form/form-types';

/** 上传页的草稿：所属歌单不进草稿 */
export type UploadDraft = SongFormData;

// 表单结构变化时换一个键，旧草稿自然作废
const STORAGE_KEY = 'koiro_upload_draft_v2';

export function loadDraft(): UploadDraft | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as UploadDraft;
    // 语种以站点定义为准，丢掉已经不支持的
    for (const lyrics of draft.lyrics) {
      lyrics.languages = lyrics.languages.filter(isLanguage);
    }
    return draft;
  } catch {
    return null;
  }
}

export function saveDraft(draft: UploadDraft) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // 存储不可用（隐私模式、配额满）时放弃草稿
  }
}

export function clearDraft() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
