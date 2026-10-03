import type { LyricsDocument } from '@/app/editor/ast/types';

/** 后端返回的错误：`{ error: string }` */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** 请求 JSON 接口；非 2xx 时抛出 ApiError（message 取后端的 error 字段） */
export async function api<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(path, {
    ...rest,
    headers:
      json === undefined
        ? rest.headers
        : { 'Content-Type': 'application/json', ...rest.headers },
    body: json === undefined ? rest.body : JSON.stringify(json),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new ApiError(res.status, body?.error ?? `请求失败：${res.status}`);
  }
  return (await res.json()) as T;
}

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type Cover = {
  url: string;
};

export type StaffEntry = {
  role: string;
  name: string[];
};

export type DefaultVersion = {
  id: string;
  name: string;
  lyrics: LyricsDocument | null;
};

/** 列表卡片用的歌曲摘要 */
export type SongSummary = {
  id: string;
  title: string;
  description: string;
  staff: StaffEntry[];
  cover: Cover | null;
  defaultVersion: DefaultVersion | null;
  versionCount: number;
  updatedAt: string;
};

export type PlaylistSummary = {
  id: string;
  name: string;
  description: string;
  cover: Cover | null;
  songCount: number;
  updatedAt: string;
};

export type StoredImage = {
  objectId: string;
  url: string;
};

/** 播放地址：后端 302 到当天有效的签名 URL */
export function audioUrl(versionId: string) {
  return `/api/audio/${versionId}`;
}

export function audioDownloadUrl(versionId: string) {
  return `/api/audio/${versionId}/download`;
}
