export type UploadDraft = {
  title: string;
  description: string;
  staff: { id: string; role: string; name: string | string[] }[];
  versions: {
    id: string;
    key: string;
    objectId: string;
    isDefault: boolean;
    lyricsId?: string | null;
  }[];
  audioDefaultName: string | null;
  lyricsVersions: {
    id: string;
    key: string;
    isDefault: boolean;
    lines: {
      id: string;
      startMs: number;
      endMs?: number;
      text: string;
      rubyByIndex?: Record<number, string>;
    }[];
    languages: string[];
  }[];
  coverObjectId: string | null;
  coverPreviewUrl?: string | null;
  coverFilename: string | null;
};

const STORAGE_KEY = 'koiro_upload_draft_v1';

export function loadDraft(): UploadDraft | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as UploadDraft;
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
