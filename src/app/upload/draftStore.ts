"use client";

export type UploadDraft = {
  title: string;
  description: string;
  staff: { id: string; role: string; name: string }[];
  versions: { id: string; key: string; objectId: string; isDefault: boolean }[];
  coverObjectId: string | null;
  musicObjectId: string | null;
  musicFilename: string | null;
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
    return JSON.parse(raw) as UploadDraft;
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
