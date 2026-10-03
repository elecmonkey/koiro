import axios from 'axios';
import { useState } from 'react';
import { api, type StoredImage } from '@/lib/api';

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

type PresignedAudio = {
  url: string;
  objectId: string;
  headers: Record<string, string>;
};

/**
 * 上传文件：
 * - 图片经后端校验格式后存储（POST /api/uploads/image）
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
        const res = await axios.post<StoredImage>('/api/uploads/image', file, {
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          onUploadProgress,
        });
        result = res.data;
      } else {
        const presigned = await api<PresignedAudio>('/api/uploads/audio', {
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
      if (
        axios.isAxiosError<{ error?: string }>(error) &&
        error.response?.data?.error
      ) {
        return fail(error.response.data.error);
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
