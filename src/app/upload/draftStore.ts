"use client";

export type UploadDraft = {
  title: string;
  description: string;
  staff: { id: string; role: string; name: string | string[] }[];
  versions: { id: string; key: string; objectId: string; isDefault: boolean }[];
  audioDefaultName: string | null;
  lyricsVersions: {
    id: string;
    key: string;
    isDefault: boolean;
    lines: { id: string; startMs: number; endMs?: number; text: string; rubyByIndex?: Record<number, string> }[];
    languages: string[];
  }[];
  coverObjectId: string | null;
  coverFilename: string | null;
};

const STORAGE_KEY = "koiro_upload_draft_v1";

export function loadDraft(): UploadDraft | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as UploadDraft;
    
    // 向后兼容：为旧草稿数据添加 languages 字段
    if (draft.lyricsVersions) {
      draft.lyricsVersions = draft.lyricsVersions.map((lyr) => ({
        ...lyr,
        languages: lyr.languages ?? ["ja"],
      }));
    }
    
    return draft;
  } catch {
    return null;
  }
}

export function saveDraft(draft: UploadDraft) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function clearDraft() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}
