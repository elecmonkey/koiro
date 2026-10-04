import type { AudioVersionId } from '@koiro/shared';
import { apiUrl } from '@/http';

/** 播放地址：服务端 302 到当天有效的签名地址 */
export const audioUrl = (id: AudioVersionId) => apiUrl(`/audio/${id}`);

/** 下载地址：以「歌名 - 版本名」作为附件文件名 */
export const audioDownloadUrl = (id: AudioVersionId) =>
  apiUrl(`/audio/${id}/download`);
