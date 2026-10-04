import type {
  ApiError as ApiErrorBody,
  AudioUpload,
  UploadedImage,
} from '@koiro/shared';
import axios from 'axios';
import { useState } from 'react';
import { api } from '@/lib/api';

type UploadResult = {
  objectId: string;
  /** 图片上传后的公开地址（音频没有） */
  url?: string;
};

type UploadState = {
  isUploading: boolean;
  error: string | null;
  objectId: string | null;
  progress: number;
};

/**
 * 上传文件：
 * - 图片经后端校验格式后存储（POST /api/uploads/images）
 * - 音频体积大，向后端要预签名地址后由浏览器直传对象存储
 */
export function useS3Upload() {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    error: null,
    objectId: null,
    progress: 0,
  });

  const onUploadProgress = (event: { loaded: number; total?: number }) => {
    if (!event.total) return;
    const percent = Math.round((event.loaded / event.total) * 100);
    setState((prev) => ({ ...prev, progress: percent }));
  };

  const fail = (error: string) => {
    setState({ isUploading: false, error, objectId: null, progress: 0 });
    return null;
  };

  const upload = async (
    file: File,
    folder: 'music' | 'img',
  ): Promise<UploadResult | null> => {
    setState({ isUploading: true, error: null, objectId: null, progress: 0 });

    let result: UploadResult;
    try {
      if (folder === 'img') {
        const res = await axios.post<UploadedImage>(
          '/api/uploads/images',
          file,
          {
            headers: {
              'Content-Type': file.type || 'application/octet-stream',
            },
            onUploadProgress,
          },
        );
        result = res.data;
      } else {
        const presigned = await api<AudioUpload>('/api/uploads/audio', {
          method: 'POST',
          json: { filename: file.name, contentType: file.type || 'audio/mpeg' },
        });
        // Content-Type / Cache-Control 已参与签名，必须原样带上
        await axios.put(presigned.url, file, {
          headers: presigned.headers,
          onUploadProgress,
        });
        result = { objectId: presigned.objectId };
      }
    } catch (error) {
      // 对象存储返回的错误体不是 ApiError，此时只用通用说明
      if (
        axios.isAxiosError<Partial<ApiErrorBody>>(error) &&
        error.response?.data?.message
      ) {
        return fail(error.response.data.message);
      }
      return fail(error instanceof Error ? error.message : '上传失败');
    }

    setState({
      isUploading: false,
      error: null,
      objectId: result.objectId,
      progress: 100,
    });
    return result;
  };

  return { ...state, upload };
}
