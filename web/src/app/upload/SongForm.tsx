import {
  LANGUAGES,
  LANGUAGE_NAMES,
  parseLrc,
  type Language,
  type PlaylistOption,
  type SongInput,
} from '@koiro/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Container,
  Divider,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import { useNavigate } from 'react-router';
import EditorShell from '../editor/EditorShell';
import { clearDraft, loadDraft, saveDraft } from './draftStore';
import VersionRow from './VersionRow';
import StaffRow from './StaffRow';
import ImageUploadField from '../components/ImageUploadField';
import type { LineDraft } from '../editor/state/useLyricsEditor';
import { toLineDrafts, toLyricLines } from '../editor/lines';
import type {
  LyricsItem,
  SongFormData,
  StaffItem,
  VersionItem,
} from './formTypes';
import { api } from '@/lib/api';

// 初始模板
const STAFF_TEMPLATE: StaffItem[] = [
  { id: 'staff_1', role: '作词', names: [] },
  { id: 'staff_2', role: '演唱', names: [] },
];

const DEFAULT_LINES: LineDraft[] = [
  { id: 'line_1', startMs: 10500, endMs: 14200, text: '君/の声が' },
  { id: 'line_2', startMs: 16800, text: '世界を変える' },
];

const buildEmptyFormData = (): SongFormData => ({
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
  playlistIds: [],
});

type SongFormProps = {
  /** 编辑模式时传入歌曲 ID */
  songId?: string;
  /** 编辑模式时传入初始数据 */
  initialData?: SongFormData;
  /** 模式：create 使用草稿存储，edit 不使用 */
  mode: 'create' | 'edit';
};

export default function SongForm({ songId, initialData, mode }: SongFormProps) {
  const navigate = useNavigate();
  const emptyFormData = useMemo(() => buildEmptyFormData(), []);

  // 仅在创建模式下从草稿加载
  const draftData = useMemo(() => {
    if (mode === 'edit') return null;
    return loadDraft();
  }, [mode]);

  // 初始值的优先级：initialData > draft > 空模板
  const getInitialValue = <K extends keyof SongFormData>(
    key: K,
    fallback: SongFormData[K],
  ): SongFormData[K] => {
    if (initialData && initialData[key] !== undefined) {
      return initialData[key];
    }
    if (draftData && draftData[key as keyof typeof draftData] !== undefined) {
      return draftData[key as keyof typeof draftData] as SongFormData[K];
    }
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

  // 播放列表相关状态
  const [allPlaylists, setAllPlaylists] = useState<PlaylistOption[]>([]);
  const [selectedPlaylists, setSelectedPlaylists] = useState<PlaylistOption[]>(
    [],
  );
  const [playlistsLoading, setPlaylistsLoading] = useState(true);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lrcText, setLrcText] = useState('');
  const [lrcError, setLrcError] = useState<string | null>(null);
  const [lyricsEditorKey, setLyricsEditorKey] = useState(0);
  const [uploadComponentKey, setUploadComponentKey] = useState(0);
  const skipNextSaveRef = useRef(false);

  // 加载所有播放列表
  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const options = await api<PlaylistOption[]>('/api/playlists/options');
        setAllPlaylists(options);

        // 如果是编辑模式，设置已选中的播放列表
        if (initialData) {
          setSelectedPlaylists(
            options.filter((p) => initialData.playlistIds.includes(p.id)),
          );
        }
      } catch {
        // 忽略错误，播放列表是可选的
      } finally {
        setPlaylistsLoading(false);
      }
    };
    void fetchPlaylists();
  }, [initialData]);

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
    const next = [...staff, { id: makeId('staff'), role: '', names: [] }];
    setStaff(next);
  };

  const updateStaff = (id: string, updates: Partial<StaffItem>) => {
    const next = staff.map((item) =>
      item.id === id ? { ...item, ...updates } : item,
    );
    setStaff(next);
  };

  const removeStaff = (id: string) => {
    const next = staff.filter((item) => item.id !== id);
    setStaff(next);
  };

  const addVersion = () => {
    const nextName = uniqueName(
      '未命名',
      versions.map((v) => v.name),
    );
    const next = [
      ...versions,
      {
        id: makeId('ver'),
        name: nextName,
        objectId: '',
        isDefault: versions.length === 0,
        lyricsId: null,
      },
    ];
    setVersions(next);
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
      versions.map((item) => ({
        ...item,
        isDefault: item.id === id,
      })),
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
    const nextName = uniqueName(
      '未命名',
      lyricsVersions.map((v) => v.name),
    );
    const next: LyricsItem[] = [
      ...lyricsVersions,
      {
        id: makeId('lyr'),
        name: nextName,
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
    const next = lyricsVersions.map((item) =>
      item.id === id ? { ...item, name: nextName } : item,
    );
    setLyricsVersions(next);
  };

  const updateLyricsLanguages = (id: string, languages: Language[]) => {
    const next = lyricsVersions.map((item) =>
      item.id === id ? { ...item, languages } : item,
    );
    setLyricsVersions(next);
  };

  const setDefaultLyrics = (id: string) => {
    const next = lyricsVersions.map((item) => ({
      ...item,
      isDefault: item.id === id,
    }));
    setLyricsVersions(next);
  };

  const removeLyricsVersion = (id: string) => {
    const next = lyricsVersions.filter((item) => item.id !== id);
    if (next.length > 0 && !next.some((item) => item.isDefault)) {
      next[0] = { ...next[0], isDefault: true };
    }
    setLyricsVersions(next);
    setActiveLyricsId(next[0]?.id ?? '');

    // 清除所有音频版本中对该歌词的绑定
    setVersions((prevVersions) =>
      prevVersions.map((v) =>
        v.lyricsId === id ? { ...v, lyricsId: null } : v,
      ),
    );
  };

  const updateLyricsLines = (id: string, lines: LineDraft[]) => {
    const next = lyricsVersions.map((item) =>
      item.id === id ? { ...item, lines } : item,
    );
    setLyricsVersions(next);
  };

  const activeLyrics = lyricsVersions.find(
    (item) => item.id === activeLyricsId,
  );

  const validateBeforeSubmit = () => {
    if (!title.trim()) return '歌曲名不能为空';
    if (!coverObjectId) return '必须上传封面';
    if (!versions.length) return '必须至少添加一个音频版本';
    if (!versions.some((v) => v.isDefault)) return '必须选择默认音频版本';
    const invalidAudio = versions.some((v) => !v.objectId);
    if (invalidAudio) return '所有音频版本都必须上传';
    const invalidAudioName = versions.some((v) => !v.name.trim());
    if (invalidAudioName) return '音频版本名不能为空';
    const invalidStaff = staff.some((s) => !s.role.trim() || !s.names.length);
    if (invalidStaff) return 'staff 的角色和姓名不能为空';
    if (lyricsVersions.length > 0) {
      const invalidLyricsName = lyricsVersions.some((v) => !v.name.trim());
      if (invalidLyricsName) return '歌词版本名不能为空';
      const defaultLyrics = lyricsVersions.find((v) => v.isDefault);
      if (!defaultLyrics) return '必须设置默认歌词版本';
    }
    return null;
  };

  const handleSubmit = async () => {
    const error = validateBeforeSubmit();
    setSubmitError(error);
    if (error) return;
    if (isSubmitting) return;
    setIsSubmitting(true);

    // 音频版本以歌词名（同一首歌内唯一）绑定歌词
    const lyricsNameById = new Map(lyricsVersions.map((l) => [l.id, l.name]));
    const payload: SongInput = {
      title,
      description,
      coverObjectId: coverObjectId ?? '',
      staff: staff.map(({ role, names }) => ({ role, names })),
      versions: versions.map((v) => ({
        name: v.name,
        objectId: v.objectId,
        isDefault: v.isDefault,
        lyricsName: v.lyricsId
          ? (lyricsNameById.get(v.lyricsId) ?? null)
          : null,
      })),
      lyrics: lyricsVersions.map((l) => ({
        name: l.name,
        isDefault: l.isDefault,
        languages: l.languages,
        lines: toLyricLines(l.lines),
      })),
      playlistIds: selectedPlaylists.map((p) => p.id),
    };

    try {
      const url = mode === 'edit' ? `/api/songs/${songId}` : '/api/songs';
      const method = mode === 'edit' ? 'PUT' : 'POST';

      await api(url, { method, json: payload });

      setSubmitSuccess(true);

      if (mode === 'create') {
        // 创建模式：清空表单和草稿
        skipNextSaveRef.current = true;
        clearDraft();
        resetForm();
      } else {
        // 编辑模式：跳转回歌曲详情
        setTimeout(() => {
          void navigate(`/songs/${songId}`);
        }, 1000);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '提交失败';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
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
    setSubmitError(null);
    setLrcText('');
    setLrcError(null);
  };

  const handleImportLrc = (content: string) => {
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

  const isEditMode = mode === 'edit';

  return (
    <>
      <Box component="main" sx={{ pb: 8 }}>
        <Container sx={{ pt: 6 }}>
          <Stack spacing={1}>
            <Typography variant="h4">
              {isEditMode ? '编辑歌曲' : '上传歌曲'}
            </Typography>
          </Stack>
        </Container>

        <Container sx={{ pt: 4 }}>
          <Stack spacing={3}>
            <Card className="float-in">
              <CardContent>
                <Stack spacing={2.5}>
                  <Typography variant="h6">歌曲信息</Typography>
                  <Stack spacing={2}>
                    <TextField
                      label="歌曲名"
                      placeholder="例如：玻璃海"
                      fullWidth
                      value={title}
                      onChange={(event) => {
                        const next = event.target.value;
                        setTitle(next);
                      }}
                    />
                    <TextField
                      label="简介"
                      placeholder="描述这首歌的氛围、来源..."
                      fullWidth
                      multiline
                      minRows={3}
                      value={description}
                      onChange={(event) => {
                        const next = event.target.value;
                        setDescription(next);
                      }}
                    />
                  </Stack>
                  <Divider />
                  <Stack spacing={1.5}>
                    <Stack
                      direction="row"
                      sx={{
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Typography variant="subtitle1">Staff</Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={addStaff}
                      >
                        添加 Staff
                      </Button>
                    </Stack>
                    <Stack spacing={1.5}>
                      {staff.map((item) => (
                        <StaffRow
                          key={item.id}
                          item={item}
                          onChange={(updates) => updateStaff(item.id, updates)}
                          onRemove={() => removeStaff(item.id)}
                        />
                      ))}
                    </Stack>
                  </Stack>
                  <Divider />
                  <Stack spacing={1.5}>
                    <Stack
                      direction="row"
                      sx={{
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Typography variant="subtitle1">音频版本</Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={addVersion}
                      >
                        添加版本
                      </Button>
                    </Stack>
                    <Stack spacing={2}>
                      {versions.map((item) => (
                        <VersionRow
                          key={`${item.id}-${uploadComponentKey}`}
                          item={item}
                          onChange={updateVersion}
                          onRemove={removeVersion}
                          onSetDefault={setDefaultVersion}
                          lyrics={lyricsVersions}
                        />
                      ))}
                    </Stack>
                  </Stack>
                  <Divider />
                  <ImageUploadField
                    key={uploadComponentKey}
                    label="封面"
                    objectId={coverObjectId}
                    previewUrl={coverPreviewUrl}
                    onObjectIdChange={(value, url) => {
                      setCoverObjectId(value);
                      setCoverPreviewUrl(url ?? null);
                    }}
                    onFilenameChange={(value) => {
                      setCoverFilename(value);
                    }}
                  />
                  <Divider />
                  <Stack spacing={1.5}>
                    <Typography variant="subtitle1">所属播放列表</Typography>
                    <Autocomplete
                      multiple
                      options={allPlaylists}
                      disableCloseOnSelect
                      getOptionLabel={(option) => option.name}
                      value={selectedPlaylists}
                      onChange={(_, value) => setSelectedPlaylists(value)}
                      loading={playlistsLoading}
                      isOptionEqualToValue={(option, value) =>
                        option.id === value.id
                      }
                      renderOption={(props, option, { selected }) => {
                        const { key, ...restProps } = props;
                        return (
                          <li key={key} {...restProps}>
                            <Checkbox
                              icon={
                                <CheckBoxOutlineBlankIcon fontSize="small" />
                              }
                              checkedIcon={<CheckBoxIcon fontSize="small" />}
                              style={{ marginRight: 8 }}
                              checked={selected}
                            />
                            {option.name}
                          </li>
                        );
                      }}
                      renderValue={(value, getItemProps) =>
                        value.map((option, index) => {
                          const { key, ...tagProps } = getItemProps({ index });
                          return (
                            <Chip
                              key={key}
                              label={option.name}
                              size="small"
                              {...tagProps}
                            />
                          );
                        })
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder={
                            selectedPlaylists.length === 0
                              ? '选择播放列表（可选）'
                              : ''
                          }
                        />
                      )}
                      noOptionsText="暂无播放列表"
                    />
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            <Card className="float-in stagger-2" sx={{ overflow: 'visible' }}>
              <CardContent sx={{ overflow: 'visible' }}>
                <Stack spacing={2}>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <Stack
                      spacing={1}
                      sx={{
                        flex: 1,
                      }}
                    >
                      <Typography variant="h6">歌词版本</Typography>
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{
                          flexWrap: 'wrap',
                        }}
                      >
                        {lyricsVersions.map((item) => (
                          <Button
                            key={item.id}
                            variant={
                              item.id === activeLyricsId
                                ? 'contained'
                                : 'outlined'
                            }
                            size="small"
                            onClick={() => setActiveLyricsId(item.id)}
                          >
                            {item.name || '未命名'}
                          </Button>
                        ))}
                        <Button
                          size="small"
                          variant="text"
                          onClick={addLyricsVersion}
                        >
                          添加歌词版本
                        </Button>
                      </Stack>
                    </Stack>
                  </Stack>
                  <Divider />
                  {activeLyrics ? (
                    <Stack spacing={2}>
                      <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={2}
                      >
                        <TextField
                          label="版本名称"
                          value={activeLyrics.name}
                          onChange={(event) =>
                            updateLyricsName(
                              activeLyrics.id,
                              event.target.value,
                            )
                          }
                          fullWidth
                        />
                        <Autocomplete
                          multiple
                          options={LANGUAGES}
                          getOptionLabel={(code) =>
                            `${LANGUAGE_NAMES[code]} (${code})`
                          }
                          value={activeLyrics.languages}
                          onChange={(_, value) =>
                            updateLyricsLanguages(activeLyrics.id, value)
                          }
                          renderValue={(value, getItemProps) =>
                            value.map((option, index) => {
                              const { key, ...tagProps } = getItemProps({
                                index,
                              });
                              return (
                                <Chip
                                  key={key}
                                  label={LANGUAGE_NAMES[option]}
                                  size="small"
                                  {...tagProps}
                                />
                              );
                            })
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="语言标签"
                              placeholder="选择语言"
                            />
                          )}
                          sx={{ minWidth: 240 }}
                        />
                        <Button
                          variant={
                            activeLyrics.isDefault ? 'contained' : 'outlined'
                          }
                          onClick={() => setDefaultLyrics(activeLyrics.id)}
                          sx={{ height: 56, minWidth: 120 }}
                        >
                          {activeLyrics.isDefault ? '默认版本' : '设为默认'}
                        </Button>
                        {lyricsVersions.length > 0 ? (
                          <Button
                            color="error"
                            onClick={() => removeLyricsVersion(activeLyrics.id)}
                            sx={{ height: 56 }}
                          >
                            删除
                          </Button>
                        ) : null}
                      </Stack>
                      <Card variant="outlined">
                        <CardContent>
                          <Stack spacing={1.5}>
                            <Typography variant="subtitle1">
                              导入 LRC
                            </Typography>
                            <TextField
                              label="粘贴 LRC 内容"
                              value={lrcText}
                              onChange={(event) =>
                                setLrcText(event.target.value)
                              }
                              multiline
                              minRows={6}
                              maxRows={6}
                              fullWidth
                              sx={{
                                '& .MuiInputBase-root': {
                                  alignItems: 'flex-start',
                                  overflow: 'auto',
                                },
                              }}
                            />
                            <Stack
                              direction="row"
                              spacing={1.5}
                              sx={{
                                flexWrap: 'wrap',
                              }}
                            >
                              <Button
                                variant="outlined"
                                onClick={() => handleImportLrc(lrcText)}
                              >
                                从粘贴内容导入
                              </Button>
                              <Button variant="outlined" component="label">
                                选择 LRC 文件
                                <input
                                  hidden
                                  type="file"
                                  accept=".lrc,text/plain"
                                  onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = () => {
                                      const content =
                                        typeof reader.result === 'string'
                                          ? reader.result
                                          : '';
                                      setLrcText(content);
                                      handleImportLrc(content);
                                    };
                                    reader.readAsText(file);
                                  }}
                                />
                              </Button>
                            </Stack>
                            {lrcError ? (
                              <Typography variant="caption" color="error">
                                {lrcError}
                              </Typography>
                            ) : null}
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'text.secondary',
                              }}
                            >
                              导入会覆盖当前版本的歌词内容。
                            </Typography>
                          </Stack>
                        </CardContent>
                      </Card>
                      <EditorShell
                        key={`${activeLyrics.id}-${lyricsEditorKey}`}
                        initialLines={activeLyrics.lines}
                        onLinesChange={(lines) =>
                          updateLyricsLines(activeLyrics.id, lines)
                        }
                        languages={activeLyrics.languages}
                      />
                    </Stack>
                  ) : null}
                  <Divider />
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      alignItems: 'center',
                    }}
                  >
                    <Button
                      variant="contained"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? '提交中...'
                        : isEditMode
                          ? '保存修改'
                          : '提交上传'}
                    </Button>
                    {!isEditMode && (
                      <Button
                        variant="outlined"
                        onClick={() => {
                          skipNextSaveRef.current = true;
                          clearDraft();
                          resetForm();
                        }}
                      >
                        清空草稿
                      </Button>
                    )}
                    {isEditMode && (
                      <Button
                        variant="outlined"
                        onClick={() => void navigate(`/songs/${songId}`)}
                      >
                        取消
                      </Button>
                    )}
                    {submitError ? (
                      <Typography variant="caption" color="error">
                        {submitError}
                      </Typography>
                    ) : null}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Container>
      </Box>
      <Snackbar
        open={submitSuccess}
        autoHideDuration={2200}
        message={isEditMode ? '保存成功' : '提交成功'}
        onClose={() => setSubmitSuccess(false)}
      />
    </>
  );
}

// 工具函数
function uniqueName(base: string, existing: string[]) {
  const cleanedBase = base.trim() || '未命名';
  const normalized = existing
    .filter((name) => name.trim())
    .map((name) => name.trim());
  const baseSet = new Set(normalized);
  if (!baseSet.has(cleanedBase)) {
    return cleanedBase;
  }
  let i = 2;
  while (baseSet.has(`${cleanedBase} ${i}`)) {
    i += 1;
  }
  return `${cleanedBase} ${i}`;
}

function makeId(prefix: string) {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}_${rand}`;
}
