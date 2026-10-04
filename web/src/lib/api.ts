import type { ApiError as ApiErrorBody, ErrorCode, Page } from '@koiro/shared';

/** 后端返回的错误（响应体为 `{ code, message }`） */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode | null,
    message: string,
  ) {
    super(message);
  }
}

async function failure(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
  return new ApiError(
    res.status,
    body?.code ?? null,
    body?.message ?? `请求失败：${String(res.status)}`,
  );
}

/**
 * 请求 JSON 接口；非 2xx 时抛出 ApiError，204 等空响应返回 `undefined`。
 * `T` 填 `@koiro/shared` 里服务端生成的接口类型：这里是前端唯一做类型断言的地方。
 */
export async function api<T = void>(
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
  if (!res.ok) throw await failure(res);
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** 组装查询字符串，跳过空值 */
export function withQuery(
  path: string,
  query: Record<string, string | number | null | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '')
      params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

/** 接口允许的最大每页条数 */
const MAX_PAGE_SIZE = 100;

/** 依次取完一个分页列表的所有页 */
export async function fetchAllPages<T>(
  path: string,
  query: Record<string, string | number | null | undefined> = {},
): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const result = await api<Page<T>>(
      withQuery(path, { ...query, page, pageSize: MAX_PAGE_SIZE }),
    );
    items.push(...result.items);
    if (page >= result.totalPages) return items;
  }
}

/** 播放地址：后端 302 到当天有效的签名 URL */
export function audioUrl(versionId: string) {
  return `/api/audio/${versionId}`;
}

export function audioDownloadUrl(versionId: string) {
  return `/api/audio/${versionId}/download`;
}
