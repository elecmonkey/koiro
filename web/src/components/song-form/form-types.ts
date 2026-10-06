import type { Language } from '@koiro/shared';
import type { LineDraft } from '@/components/lyrics-editor/use-lyrics-editor';

/** 表单里的条目都带一个本地 id，供 React 渲染和互相引用 */
export type StaffItem = {
  id: string;
  role: string;
  names: string[];
};

export type VersionItem = {
  id: string;
  name: string;
  /** 上传音频得到的对象 ID；还没上传时为空串 */
  objectId: string;
  isDefault: boolean;
  /** 绑定的歌词：表单内 LyricsItem 的 id */
  lyricsId: string | null;
};

export type LyricsItem = {
  id: string;
  name: string;
  isDefault: boolean;
  /** 编辑形式的行，提交时转成接口的歌词行 */
  lines: LineDraft[];
  languages: Language[];
};

export type SongFormData = {
  title: string;
  description: string;
  staff: StaffItem[];
  versions: VersionItem[];
  lyrics: LyricsItem[];
  coverObjectId: string | null;
  /** 封面预览地址（上传后或编辑时） */
  coverPreviewUrl: string | null;
  coverFilename: string | null;
};
