import type {
  AudioUpload,
  AudioUploadRequest,
  ImageUrl,
  UploadedImage,
} from '@koiro/shared';
import { apiUrl, request, sendFile } from '@/http';

/** 上传图片；服务端校验格式后保存 */
export async function uploadImage(
  file: Blob,
  onProgress?: (percent: number) => void,
): Promise<UploadedImage> {
  const body = await sendFile('POST', apiUrl('/uploads/images'), file, {
    headers: { 'Content-Type': 'application/octet-stream' },
    onProgress,
  });
  return JSON.parse(body) as UploadedImage;
}

/** 由服务器下载一张网络图片 */
export const uploadImageFromUrl = (body: ImageUrl) =>
  request<UploadedImage>('POST', '/uploads/images/from-url', { body });

/**
 * 上传音频：先申请预签名地址，再直传对象存储（必须原样带上签名过的请求头）。
 * 返回填入音频版本的对象 ID。
 */
export async function uploadAudio(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const ticket = await request<AudioUpload>('POST', '/uploads/audio', {
    body: {
      filename: file.name,
      contentType: file.type || 'audio/mpeg',
    } satisfies AudioUploadRequest,
  });
  await sendFile('PUT', ticket.url, file, {
    headers: ticket.headers,
    onProgress,
  });
  return ticket.objectId;
}
