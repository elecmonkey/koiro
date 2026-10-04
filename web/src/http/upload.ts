import { ApiError, apiErrorFrom } from './api-error';

export interface UploadOptions {
  headers?: Record<string, string>;
  /** 0–100 */
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

/**
 * 发送文件并报告上传进度（fetch 不支持上传进度，所以用 XHR）。
 * 返回响应正文；失败时抛出 ApiError。
 */
export function sendFile(
  method: 'POST' | 'PUT',
  url: string,
  file: Blob,
  { headers = {}, onProgress, signal }: UploadOptions = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    for (const [name, value] of Object.entries(headers))
      xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.responseText);
      else reject(apiErrorFrom(xhr.status, xhr.responseText));
    };
    xhr.onerror = () => reject(new ApiError(0, null, '网络错误，上传失败'));
    xhr.onabort = () => reject(new DOMException('上传已取消', 'AbortError'));
    signal?.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}
