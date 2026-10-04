import type { ApiError as ApiErrorBody, ErrorCode } from '@koiro/shared';

/** 请求失败：服务端的错误体为 `{ code, message }`；非 JSON 响应（如代理错误）时 code 为空 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode | null,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function apiErrorFrom(status: number, body: string): ApiError {
  let parsed: Partial<ApiErrorBody> | null = null;
  try {
    parsed = JSON.parse(body) as Partial<ApiErrorBody>;
  } catch {
    // 非 JSON 响应，使用通用说明
  }
  return new ApiError(
    status,
    parsed?.code ?? null,
    parsed?.message ?? `请求失败（${String(status)}）`,
  );
}
