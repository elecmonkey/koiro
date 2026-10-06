import type { Language, PlaylistOption } from '@koiro/shared';
import { parseLrc } from '@koiro/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { LineDraft } from '@/components/lyrics-editor/use-lyrics-editor';
import { toLineDrafts } from '@/components/lyrics-editor/lines';
import { usePlaylistOptions } from '@/query';
import { clearDraft, loadDraft, saveDraft } from '@/stores/upload-draft';
import type {
  LyricsItem,
  SongFormData,
  StaffItem,
  VersionItem,
} from './form-types';

const STAFF_TEMPLATE: StaffItem[] = [
  { id: 'staff_1', role: '作词', names: [] },
  { id: 'staff_2', role: '演唱', names: [] },
];

const DEFAULT_LINES: LineDraft[] = [
  { id: 'line_1', startMs: 10500, endMs: 14200, text: '君/の声が' },
  { id: 'line_2', startMs: 16800, text: '世界を変える' },
];

function buildEmptyFormData(): SongFormData {
  return {
    title: '',
    description: '',
    staff: STAFF_TEMPLATE,
    versions: [
      {
        id: makeId('ver'),
        name: '主版本',
        objectId: '',
        isDefault: true,
        lyricsId: null,
      },
    ],
    lyrics: [
      {
        id: makeId('lyr'),
        name: '原文',
        isDefault: true,
        lines: DEFAULT_LINES,
        languages: ['zh'],
      },
    ],
    coverObjectId: null,
    coverPreviewUrl: null,
    coverFilename: null,
  };
}

/** 在候选名里找一个不重复的名字；都重复时追加序号 */
function uniqueName(base: string, existing: string[]) {
  const cleanedBase = base.trim() || '未命名';
  const normalized = existing
    .filter((name) => name.trim())
    .map((name) => name.trim());
  const baseSet = new Set(normalized);
  if (!baseSet.has(cleanedBase)) return cleanedBase;
  let i = 2;
  while (baseSet.has(`${cleanedBase} ${i}`)) i += 1;
  return `${cleanedBase} ${i}`;
}

function makeId(prefix: string) {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}_${rand}`;
}

/**
 * 歌曲表单的全部字段与编辑操作。创建模式下自动读取、保存本地草稿；
 * 编辑模式下以 `initialData` 为初值，不使用草稿。
 */
export function useSongForm(
  mode: 'create' | 'edit',
  initialData?: SongFormData,
) {
  const emptyFormData = useMemo(() => buildEmptyFormData(), []);

  // 仅在创建模式下从草稿加载
  const draftData = useMemo(
    () => (mode === 'edit' ? null : loadDraft()),
    [mode],
  );

  // 初始值的优先级：initialData > draft > 空模板
  const getInitialValue = <K extends keyof SongFormData>(
    key: K,
    fallback: SongFormData[K],
  ): SongFormData[K] => {
    if (initialData && initialData[key] !== undefined) return initialData[key];
    if (draftData && draftData[key] !== undefined) return draftData[key];
    return fallback;
  };

  const [staff, setStaff] = useState<StaffItem[]>(() =>
    getInitialValue('staff', emptyFormData.staff),
  );
  const [versions, setVersions] = useState<VersionItem[]>(() =>
    getInitialValue('versions', emptyFormData.versions),
  );
  const [title, setTitle] = useState(() =>
    getInitialValue('title', emptyFormData.title),
  );
  const [description, setDescription] = useState(() =>
    getInitialValue('description', emptyFormData.description),
  );
  const [coverObjectId, setCoverObjectId] = useState<string | null>(() =>
    getInitialValue('coverObjectId', emptyFormData.coverObjectId),
  );
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(() =>
    getInitialValue('coverPreviewUrl', emptyFormData.coverPreviewUrl),
  );
  const [coverFilename, setCoverFilename] = useState<string | null>(() =>
    getInitialValue('coverFilename', emptyFormData.coverFilename),
  );
  const [lyricsVersions, setLyricsVersions] = useState<LyricsItem[]>(() =>
    getInitialValue('lyrics', emptyFormData.lyrics),
  );
  const [activeLyricsId, setActiveLyricsId] = useState<string>(
    () => lyricsVersions[0]?.id ?? '',
  );

  // 新建时要加入的歌单；编辑歌曲不改所属歌单，那在歌单一侧管理
  const allPlaylists = usePlaylistOptions();
  const [selectedPlaylists, setSelectedPlaylists] = useState<PlaylistOption[]>(
    [],
  );

  const [lrcText, setLrcText] = useState('');
  const [lrcError, setLrcError] = useState<string | null>(null);
  const [lyricsEditorKey, setLyricsEditorKey] = useState(0);
  const [uploadComponentKey, setUploadComponentKey] = useState(0);
  const skipNextSaveRef = useRef(false);

  // 仅在创建模式下保存草稿
  useEffect(() => {
    if (mode === 'edit') return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    saveDraft({
      title,
      description,
      staff,
      versions,
      lyrics: lyricsVersions,
      coverObjectId,
      coverPreviewUrl,
      coverFilename,
    });
  }, [
    mode,
    title,
    description,
    staff,
    versions,
    lyricsVersions,
    coverObjectId,
    coverPreviewUrl,
    coverFilename,
  ]);

  const addStaff = () => {
    setStaff([...staff, { id: makeId('staff'), role: '', names: [] }]);
  };

  const updateStaff = (id: string, updates: Partial<StaffItem>) => {
    setStaff(
      staff.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  };

  const removeStaff = (id: string) => {
    setStaff(staff.filter((item) => item.id !== id));
  };

  const addVersion = () => {
    const name = uniqueName(
      '未命名',
      versions.map((v) => v.name),
    );
    setVersions([
      ...versions,
      {
        id: makeId('ver'),
        name,
        objectId: '',
        isDefault: versions.length === 0,
        lyricsId: null,
      },
    ]);
  };

  const updateVersion = (id: string, updates: Partial<VersionItem>) => {
    let nextName = updates.name;
    if (typeof nextName === 'string') {
      nextName = uniqueName(
        nextName,
        versions.filter((v) => v.id !== id).map((v) => v.name),
      );
    }
    setVersions(
      versions.map((item) =>
        item.id === id
          ? { ...item, ...updates, name: nextName ?? item.name }
          : item,
      ),
    );
  };

  const setDefaultVersion = (id: string) => {
    setVersions(
      versions.map((item) => ({ ...item, isDefault: item.id === id })),
    );
  };

  const removeVersion = (id: string) => {
    const next = versions.filter((item) => item.id !== id);
    if (next.length > 0 && !next.some((item) => item.isDefault)) {
      next[0] = { ...next[0], isDefault: true };
    }
    setVersions(next);
  };

  const addLyricsVersion = () => {
    const name = uniqueName(
      '未命名',
      lyricsVersions.map((v) => v.name),
    );
    const next: LyricsItem[] = [
      ...lyricsVersions,
      {
        id: makeId('lyr'),
        name,
        isDefault: lyricsVersions.length === 0,
        lines: DEFAULT_LINES,
        languages: ['zh'],
      },
    ];
    setLyricsVersions(next);
    setActiveLyricsId(next[next.length - 1].id);
  };

  const updateLyricsName = (id: string, name: string) => {
    const nextName = uniqueName(
      name,
      lyricsVersions.filter((v) => v.id !== id).map((v) => v.name),
    );
    setLyricsVersions(
      lyricsVersions.map((item) =>
        item.id === id ? { ...item, name: nextName } : item,
      ),
    );
  };

  const updateLyricsLanguages = (id: string, languages: Language[]) => {
    setLyricsVersions(
      lyricsVersions.map((item) =>
        item.id === id ? { ...item, languages } : item,
      ),
    );
  };

  const setDefaultLyrics = (id: string) => {
    setLyricsVersions(
      lyricsVersions.map((item) => ({ ...item, isDefault: item.id === id })),
    );
  };

  const removeLyricsVersion = (id: string) => {
    const next = lyricsVersions.filter((item) => item.id !== id);
    if (next.length > 0 && !next.some((item) => item.isDefault)) {
      next[0] = { ...next[0], isDefault: true };
    }
    setLyricsVersions(next);
    setActiveLyricsId(next[0]?.id ?? '');
    // 清除所有音频版本中对该歌词的绑定
    setVersions((prev) =>
      prev.map((v) => (v.lyricsId === id ? { ...v, lyricsId: null } : v)),
    );
  };

  const updateLyricsLines = (id: string, lines: LineDraft[]) => {
    setLyricsVersions(
      lyricsVersions.map((item) =>
        item.id === id ? { ...item, lines } : item,
      ),
    );
  };

  const activeLyrics = lyricsVersions.find(
    (item) => item.id === activeLyricsId,
  );

  const importLrc = (content: string) => {
    if (!activeLyrics) {
      setLrcError('请选择一个歌词版本');
      return;
    }
    const parsed = parseLrc(content);
    if (!parsed.length) {
      setLrcError('未解析到有效的 LRC 行');
      return;
    }
    setLrcError(null);
    updateLyricsLines(activeLyrics.id, toLineDrafts(parsed, makeId('lrc')));
    setLyricsEditorKey((prev) => prev + 1);
  };

  const resetForm = () => {
    const nextEmpty = buildEmptyFormData();
    setTitle('');
    setDescription('');
    setStaff(STAFF_TEMPLATE);
    setVersions(nextEmpty.versions);
    setLyricsVersions(nextEmpty.lyrics);
    setActiveLyricsId(nextEmpty.lyrics[0]?.id ?? '');
    setLyricsEditorKey((prev) => prev + 1);
    setUploadComponentKey((prev) => prev + 1);
    setCoverObjectId(null);
    setCoverPreviewUrl(null);
    setCoverFilename(null);
    setSelectedPlaylists([]);
    setLrcText('');
    setLrcError(null);
  };

  const clearDraftAndReset = () => {
    skipNextSaveRef.current = true;
    clearDraft();
    resetForm();
  };

  const validate = (): string | null => {
    if (!title.trim()) return '歌曲名不能为空';
    if (!coverObjectId) return '必须上传封面';
    if (!versions.length) return '必须至少添加一个音频版本';
    if (!versions.some((v) => v.isDefault)) return '必须选择默认音频版本';
    if (versions.some((v) => !v.objectId)) return '所有音频版本都必须上传';
    if (versions.some((v) => !v.name.trim())) return '音频版本名不能为空';
    if (staff.some((s) => !s.role.trim() || !s.names.length))
      return 'staff 的角色和姓名不能为空';
    if (lyricsVersions.length > 0) {
      if (lyricsVersions.some((v) => !v.name.trim()))
        return '歌词版本名不能为空';
      if (!lyricsVersions.some((v) => v.isDefault))
        return '必须设置默认歌词版本';
    }
    return null;
  };

  return {
    mode,
    title,
    setTitle,
    description,
    setDescription,
    staff,
    addStaff,
    updateStaff,
    removeStaff,
    versions,
    addVersion,
    updateVersion,
    removeVersion,
    setDefaultVersion,
    coverObjectId,
    coverPreviewUrl,
    coverFilename,
    setCover: (objectId: string | null, previewUrl: string | null) => {
      setCoverObjectId(objectId);
      setCoverPreviewUrl(previewUrl);
    },
    setCoverFilename,
    lyricsVersions,
    activeLyrics,
    activeLyricsId,
    setActiveLyricsId,
    addLyricsVersion,
    updateLyricsName,
    updateLyricsLanguages,
    setDefaultLyrics,
    removeLyricsVersion,
    updateLyricsLines,
    lrcText,
    setLrcText,
    lrcError,
    importLrc,
    allPlaylists: allPlaylists.data ?? [],
    playlistsLoading: allPlaylists.isPending,
    selectedPlaylists,
    setSelectedPlaylists,
    lyricsEditorKey,
    uploadComponentKey,
    validate,
    resetForm,
    clearDraftAndReset,
  };
}

export type SongFormState = ReturnType<typeof useSongForm>;
