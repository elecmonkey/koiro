import { randomUUID } from 'node:crypto';
import { open, rename, rm, stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { CliError } from './errors';
import { object, parseJson } from './json';

/** 服务端的错误体为 `{ code, message }`；代理返回的 HTML 等非 JSON 内容保留通用说明 */
function serverMessage(text: string): string | undefined {
  try {
    const message = object(parseJson(text)).message;
    return typeof message === 'string' && message ? message : undefined;
  } catch {
    return undefined;
  }
}

function failure(status: number, text: string): CliError {
  const message = serverMessage(text);
  if (status === 401)
    return new CliError(
      'auth',
      message ?? 'Login is missing or expired. Run koiro login again.',
      3,
    );
  if (status === 403)
    return new CliError(
      'forbidden',
      message ?? 'This account does not have permission for that action.',
      4,
    );
  if (status === 404)
    return new CliError(
      'not_found',
      message ??
        'The resource does not exist or is not visible to this account.',
      5,
    );
  if (status === 409)
    return new CliError(
      'conflict',
      message ?? 'The request conflicts with existing data.',
      6,
    );
  return new CliError(
    'api',
    message ?? `Koiro returned HTTP ${String(status)}.`,
    8,
  );
}

const unreachable = new CliError(
  'network',
  'Cannot reach Koiro or the request timed out. Writes may have completed; check before retrying.',
  7,
);

/** 本地文件系统才会产生的错误码；网络错误不属于这些 */
const localCodes = new Set([
  'ENOSPC',
  'EDQUOT',
  'EROFS',
  'EACCES',
  'EPERM',
  'EFBIG',
  'EIO',
  'ENOENT',
  'EEXIST',
]);

function isLocal(error: unknown) {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof error.code === 'string' &&
    localCodes.has(error.code)
  );
}

function cannotSave(destination: string) {
  return new CliError(
    'write_failed',
    `Cannot write ${destination}. Check that the directory exists and is writable.`,
    1,
  );
}

export class ApiClient {
  readonly apiUrl: string;

  constructor(
    readonly webUrl: string,
    private readonly token?: string,
  ) {
    this.apiUrl = `${webUrl}/api`;
  }

  /** 没有登录时不带凭据：站点开放匿名浏览时只读请求仍可用，否则服务端返回 401（退出码 3） */
  private headers(extra: Record<string, string> = {}, authenticated = true) {
    return {
      accept: 'application/json',
      ...(authenticated && this.token
        ? { authorization: `Bearer ${this.token}` }
        : {}),
      ...extra,
    };
  }

  /**
   * 请求 JSON 接口。响应的类型由调用方按 `@koiro/shared` 的接口类型给出：
   * 那些类型由服务端生成，这里是整个命令行唯一做类型断言的地方。
   */
  async request<T = unknown>(
    path: string,
    method = 'GET',
    body?: unknown,
    query: Record<string, string | number | boolean | undefined> = {},
    authenticated = true,
  ): Promise<T> {
    const headers = this.headers(
      body === undefined ? {} : { 'content-type': 'application/json' },
      authenticated,
    );
    const url = new URL(`${this.apiUrl}${path}`);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    let response: Response;
    let text: string;
    try {
      response = await fetch(url, {
        method,
        redirect: 'error',
        signal: AbortSignal.timeout(30_000),
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      text = await response.text();
    } catch {
      throw unreachable;
    }
    if (!response.ok) throw failure(response.status, text);
    return (text === '' ? null : parseJson(text)) as T;
  }

  /** 原始字节上传到后端（图片） */
  async upload<T>(path: string, data: Buffer, contentType: string): Promise<T> {
    const headers = this.headers({ 'content-type': contentType });
    let response: Response;
    let text: string;
    try {
      response = await fetch(`${this.apiUrl}${path}`, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(300_000),
        headers,
        body: new Uint8Array(data),
      });
      text = await response.text();
    } catch {
      throw unreachable;
    }
    if (!response.ok) throw failure(response.status, text);
    return parseJson(text) as T;
  }

  /** 按预签名地址直传对象存储；不携带 Koiro 的凭据 */
  async putPresigned(
    url: string,
    data: Buffer,
    headers: Record<string, string>,
  ) {
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'PUT',
        redirect: 'error',
        signal: AbortSignal.timeout(1_800_000),
        headers,
        body: new Uint8Array(data),
      });
    } catch {
      throw unreachable;
    }
    if (!response.ok)
      throw new CliError(
        'upload_failed',
        `Object storage rejected the upload (HTTP ${String(response.status)}).`,
        8,
      );
  }

  /**
   * 下载需要权限的文件：先向 Koiro 取签名地址（302），再不带凭据地从对象存储下载。
   * 写入同目录临时文件，完整收到后才 rename 到目标路径。
   */
  async download(
    path: string,
    destination: string,
  ): Promise<{ sizeBytes: number }> {
    const headers = this.headers();
    let location: string | null;
    try {
      const response = await fetch(`${this.apiUrl}${path}`, {
        redirect: 'manual',
        signal: AbortSignal.timeout(30_000),
        headers,
      });
      if (response.status < 300 || response.status >= 400)
        throw failure(response.status, await response.text().catch(() => ''));
      location = response.headers.get('location');
    } catch (error) {
      if (error instanceof CliError) throw error;
      throw unreachable;
    }
    if (!location)
      throw new CliError(
        'invalid_response',
        'Koiro did not return a download address.',
        8,
      );

    let response: Response;
    try {
      response = await fetch(location, {
        redirect: 'error',
        signal: AbortSignal.timeout(1_800_000),
      });
    } catch {
      throw unreachable;
    }
    if (!response.ok || !response.body)
      throw new CliError(
        'download_failed',
        `Object storage returned HTTP ${String(response.status)}.`,
        8,
      );
    const temporary = `${destination}.${randomUUID()}.part`;
    const handle = await open(temporary, 'wx', 0o644).catch(() => {
      throw cannotSave(destination);
    });
    let transferred = false;
    try {
      await pipeline(
        Readable.fromWeb(response.body as WebReadableStream<Uint8Array>),
        handle.createWriteStream(),
      );
      transferred = true;
      const { size } = await stat(temporary);
      await rename(temporary, destination);
      return { sizeBytes: size };
    } catch (error) {
      await rm(temporary, { force: true });
      throw transferred || isLocal(error)
        ? cannotSave(destination)
        : unreachable;
    } finally {
      await handle.close().catch(() => undefined);
    }
  }
}
