import { useState } from 'react';
import { uploadAudio, uploadImage } from '@/api';

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

  const upload = async (
    file: File,
    folder: 'music' | 'img',
  ): Promise<UploadResult | null> => {
    setState({ isUploading: true, error: null, objectId: null, progress: 0 });
    const onProgress = (progress: number) =>
      setState((prev) => ({ ...prev, progress }));

    let result: UploadResult;
    try {
      result =
        folder === 'img'
          ? await uploadImage(file, onProgress)
          : { objectId: await uploadAudio(file, onProgress) };
    } catch (error) {
      const message = error instanceof Error ? error.message : '上传失败';
      setState({
        isUploading: false,
        error: message,
        objectId: null,
        progress: 0,
      });
      return null;
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
