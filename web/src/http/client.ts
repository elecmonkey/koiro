import { apiErrorFrom } from './api-error';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type Query = Record<string, string | number | null | undefined>;

export interface RequestOptions {
  query?: Query;
  body?: unknown;
  signal?: AbortSignal;
}

/** `/api` 下的地址，附带查询参数（跳过空值） */
export function apiUrl(path: string, query: Query = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '')
      params.set(key, String(value));
  }
  const search = params.toString();
  return `/api${path}${search ? `?${search}` : ''}`;
}

/**
 * 唯一发 JSON 请求的地方。会话凭据是 HttpOnly cookie，由浏览器自动携带。
 * 非 2xx 抛出 ApiError；空响应（如 204）返回 undefined。
 * `T` 由 api/ 层按 `@koiro/shared` 的接口类型给出：这里是前端唯一做类型断言的地方。
 */
export async function request<T>(
  method: HttpMethod,
  path: string,
  { query, body, signal }: RequestOptions = {},
): Promise<T> {
  const response = await fetch(apiUrl(path, query), {
    method,
    signal,
    headers:
      body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw apiErrorFrom(response.status, text);
  return (text ? JSON.parse(text) : undefined) as T;
}
