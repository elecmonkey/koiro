import type { SongInput } from '@koiro/shared';
import { toLineDrafts } from '@/components/lyrics-editor/lines';
import type { SongFormData } from './form-types';

/** 接口的歌曲输入 → 表单数据；表单内的条目用本地 id 互相引用 */
export function toFormData(input: SongInput, coverUrl: string): SongFormData {
  const lyrics = input.lyrics.map((item, index) => ({
    id: `lyr_${String(index)}`,
    name: item.name,
    isDefault: item.isDefault,
    lines: toLineDrafts(item.lines, `lyr_${String(index)}`),
    languages: item.languages,
  }));
  const lyricsIdByName = new Map(lyrics.map((item) => [item.name, item.id]));
  return {
    title: input.title,
    description: input.description,
    staff: input.staff.map((credit, index) => ({
      id: `staff_${String(index)}`,
      role: credit.role,
      names: credit.names,
    })),
    versions: input.versions.map((version, index) => ({
      id: `ver_${String(index)}`,
      name: version.name,
      objectId: version.objectId,
      isDefault: version.isDefault,
      lyricsId:
        version.lyricsName === null
          ? null
          : (lyricsIdByName.get(version.lyricsName) ?? null),
    })),
    lyrics,
    coverObjectId: input.coverObjectId,
    coverPreviewUrl: coverUrl,
    coverFilename: null,
  };
}
