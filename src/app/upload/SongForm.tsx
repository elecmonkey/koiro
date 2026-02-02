"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
} from "@mui/material";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import { useRouter } from "next/navigation";
import EditorShell from "../editor/EditorShell";
import { clearDraft, loadDraft, saveDraft } from "./draftStore";
import VersionRow from "./VersionRow";
import StaffRow from "./StaffRow";
import ImageUploadField from "../components/ImageUploadField";
import type { LineDraft } from "../editor/state/useLyricsEditor";

type StaffItem = {
  id: string;
  role: string;
  name: string | string[];
};

type VersionItem = {
  id: string;
  key: string;
  objectId: string;
  isDefault: boolean;
  lyricsId?: string | null; // 绑定的歌词版本ID
};

type LyricsVersion = {
  id: string;
  key: string;
  isDefault: boolean;
  lines: LineDraft[];
  languages: string[];
};

type PlaylistOption = {
  id: string;
  name: string;
};

// 表单数据类型
export type SongFormData = {
  title: string;
  description: string;
  staff: StaffItem[];
  versions: VersionItem[];
  audioDefaultName: string | null;
  lyricsVersions: LyricsVersion[];
  coverObjectId: string | null;
  coverFilename: string | null;
  playlistIds?: string[];
};

// 初始模板
const STAFF_TEMPLATE: StaffItem[] = [
  { id: "staff_1", role: "作词", name: "" },
  { id: "staff_2", role: "演唱", name: "" },
];

const VERSION_TEMPLATE: VersionItem[] = [
  { id: "ver_1", key: "主版本", objectId: "", isDefault: true, lyricsId: null },
];

const DEFAULT_LINES: LineDraft[] = [
  { id: "line_1", startMs: 10500, endMs: 14200, text: "君/の声が" },
  { id: "line_2", startMs: 16800, text: "世界を変える" },
];

const EMPTY_FORM_DATA: SongFormData = {
  title: "",
  description: "",
  staff: STAFF_TEMPLATE,
  versions: VERSION_TEMPLATE,
  audioDefaultName: VERSION_TEMPLATE[0].key,
  lyricsVersions: [{ id: "lyr_1", key: "原文", isDefault: true, lines: DEFAULT_LINES, languages: ["ja"] }],
  coverObjectId: null,
  coverFilename: null,
};

type SongFormProps = {
  /** 编辑模式时传入歌曲 ID */
  songId?: string;
  /** 编辑模式时传入初始数据 */
  initialData?: SongFormData;
  /** 模式：create 使用草稿存储，edit 不使用 */
  mode: "create" | "edit";
};

export default function SongForm({ songId, initialData, mode }: SongFormProps) {
  const router = useRouter();
  
  // 仅在创建模式下从草稿加载
  const draftData = useMemo(() => {
    if (mode === "edit") return null;
    return loadDraft();
  }, [mode]);

  // 初始值的优先级：initialData > draft > 空模板
  const getInitialValue = <K extends keyof SongFormData>(
    key: K,
    fallback: SongFormData[K]
  ): SongFormData[K] => {
    if (initialData && initialData[key] !== undefined) {
      return initialData[key];
    }
    if (draftData && draftData[key as keyof typeof draftData] !== undefined) {
      return draftData[key as keyof typeof draftData] as SongFormData[K];
    }
    return fallback;
  };

  const [staff, setStaff] = useState<StaffItem[]>(
    () => getInitialValue("staff", EMPTY_FORM_DATA.staff)
  );
  const [versions, setVersions] = useState<VersionItem[]>(
    () => getInitialValue("versions", EMPTY_FORM_DATA.versions)
  );
  const [audioDefaultName, setAudioDefaultName] = useState<string | null>(
    () => getInitialValue("audioDefaultName", EMPTY_FORM_DATA.audioDefaultName)
  );
  const [title, setTitle] = useState(
    () => getInitialValue("title", EMPTY_FORM_DATA.title)
  );
  const [description, setDescription] = useState(
    () => getInitialValue("description", EMPTY_FORM_DATA.description)
  );
  const [coverObjectId, setCoverObjectId] = useState<string | null>(
    () => getInitialValue("coverObjectId", EMPTY_FORM_DATA.coverObjectId)
  );
  const [coverFilename, setCoverFilename] = useState<string | null>(
    () => getInitialValue("coverFilename", EMPTY_FORM_DATA.coverFilename)
  );
  const [lyricsVersions, setLyricsVersions] = useState<LyricsVersion[]>(
    () => getInitialValue("lyricsVersions", EMPTY_FORM_DATA.lyricsVersions)
  );
  const [activeLyricsId, setActiveLyricsId] = useState<string>(
    () => (initialData?.lyricsVersions?.[0]?.id ?? draftData?.lyricsVersions?.[0]?.id ?? "lyr_1")
  );

  // 播放列表相关状态
  const [allPlaylists, setAllPlaylists] = useState<PlaylistOption[]>([]);
  const [selectedPlaylists, setSelectedPlaylists] = useState<PlaylistOption[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(true);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lrcText, setLrcText] = useState("");
  const [lrcError, setLrcError] = useState<string | null>(null);
  const [lyricsEditorKey, setLyricsEditorKey] = useState(0);
  const [uploadComponentKey, setUploadComponentKey] = useState(0);
  const skipNextSaveRef = useRef(false);

  // 加载所有播放列表
  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const res = await fetch("/api/playlists");
        if (res.ok) {
          const data = await res.json();
          const options: PlaylistOption[] = data.playlists.map((p: { id: string; name: string }) => ({
            id: p.id,
            name: p.name,
          }));
          setAllPlaylists(options);
          
          // 如果是编辑模式，设置已选中的播放列表
          if (initialData?.playlistIds) {
            const selected = options.filter((p) => initialData.playlistIds?.includes(p.id));
            setSelectedPlaylists(selected);
          }
        }
      } catch {
        // 忽略错误，播放列表是可选的
      } finally {
        setPlaylistsLoading(false);
      }
    };
    fetchPlaylists();
  }, [initialData?.playlistIds]);

  // 仅在创建模式下保存草稿
  useEffect(() => {
    if (mode === "edit") return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    saveDraft({
      title,
      description,
      staff,
      versions,
      audioDefaultName,
      lyricsVersions,
      coverObjectId,
      coverFilename,
    });
  }, [
    mode,
    title,
    description,
    staff,
    versions,
    audioDefaultName,
    lyricsVersions,
    coverObjectId,
    coverFilename,
  ]);

  const addStaff = () => {
    const next = [...staff, { id: makeId("staff"), role: "", name: "" }];
    setStaff(next);
  };

  const updateStaff = (id: string, updates: Partial<StaffItem>) => {
    const next = staff.map((item) => (item.id === id ? { ...item, ...updates } : item));
    setStaff(next);
  };

  const removeStaff = (id: string) => {
    const next = staff.filter((item) => item.id !== id);
    setStaff(next);
  };

  const addVersion = () => {
    const nextName = uniqueName("未命名", versions.map((v) => v.key));
    const next = [
      ...versions,
      {
        id: makeId("ver"),
        key: nextName,
        objectId: "",
        isDefault: versions.length === 0,
        lyricsId: null,
      },
    ];
    setVersions(next);
  };

  const updateVersion = (id: string, updates: Partial<VersionItem>) => {
    let nextKey = updates.key;
    if (typeof nextKey === "string") {
      nextKey = uniqueName(
        nextKey,
        versions.filter((v) => v.id !== id).map((v) => v.key)
      );
    }
    const next = versions.map((item) =>
      item.id === id ? { ...item, ...updates, key: nextKey ?? item.key } : item
    );
    setVersions(next);
    if (updates.key && next.find((v) => v.id === id)?.isDefault) {
      setAudioDefaultName(next.find((v) => v.id === id)?.key ?? null);
      return;
    }
  };

  const setDefaultVersion = (id: string) => {
    const next = versions.map((item) => ({ ...item, isDefault: item.id === id }));
    const defaultName = next.find((item) => item.id === id)?.key ?? null;
    setVersions(next);
    setAudioDefaultName(defaultName && defaultName.length > 0 ? defaultName : null);
  };

  const removeVersion = (id: string) => {
    const next = versions.filter((item) => item.id !== id);
    if (next.length > 0 && !next.some((item) => item.isDefault)) {
      next[0].isDefault = true;
      setAudioDefaultName(next[0].key || null);
    }
    setVersions(next);
  };

  const addLyricsVersion = () => {
    const nextKey = uniqueName(
      "未命名",
      lyricsVersions.map((v) => v.key)
    );
    const next = [
      ...lyricsVersions,
      {
        id: makeId("lyr"),
        key: nextKey,
        isDefault: lyricsVersions.length === 0,
        lines: DEFAULT_LINES,
        languages: ["ja"],
      },
    ];
    setLyricsVersions(next);
    setActiveLyricsId(next[next.length - 1].id);
  };

  const updateLyricsKey = (id: string, key: string) => {
    const nextKey = uniqueName(
      key,
      lyricsVersions.filter((v) => v.id !== id).map((v) => v.key)
    );
    const next = lyricsVersions.map((item) =>
      item.id === id ? { ...item, key: nextKey } : item
    );
    setLyricsVersions(next);
  };

  const updateLyricsLanguages = (id: string, languages: string[]) => {
    const next = lyricsVersions.map((item) =>
      item.id === id ? { ...item, languages } : item
    );
    setLyricsVersions(next);
  };

  const setDefaultLyrics = (id: string) => {
    const next = lyricsVersions.map((item) => ({ ...item, isDefault: item.id === id }));
    setLyricsVersions(next);
  };

  const removeLyricsVersion = (id: string) => {
    const next = lyricsVersions.filter((item) => item.id !== id);
    if (next.length > 0 && !next.some((item) => item.isDefault)) {
      next[0].isDefault = true;
    }
    setLyricsVersions(next);
    setActiveLyricsId(next[0]?.id ?? "");
    
    // 清除所有音频版本中对该歌词的绑定
    setVersions(prevVersions => 
      prevVersions.map(v => 
        v.lyricsId === id ? { ...v, lyricsId: null } : v
      )
    );
  };

  const updateLyricsLines = (id: string, lines: LineDraft[]) => {
    const next = lyricsVersions.map((item) =>
      item.id === id ? { ...item, lines } : item
    );
    setLyricsVersions(next);
  };

  const activeLyrics = lyricsVersions.find((item) => item.id === activeLyricsId);

  const validateBeforeSubmit = () => {
    if (!title.trim()) return "歌曲名不能为空";
    if (!coverObjectId) return "必须上传封面";
    if (!versions.length) return "必须至少添加一个音频版本";
    if (!audioDefaultName) return "必须选择默认音频版本";
    const invalidAudio = versions.some((v) => !v.objectId);
    if (invalidAudio) return "所有音频版本都必须上传";
    const invalidAudioName = versions.some((v) => !v.key.trim());
    if (invalidAudioName) return "音频版本名不能为空";
    if (lyricsVersions.length > 0) {
      const invalidLyricsName = lyricsVersions.some((v) => !v.key.trim());
      if (invalidLyricsName) return "歌词版本名不能为空";
      const defaultLyrics = lyricsVersions.find((v) => v.isDefault);
      if (!defaultLyrics) return "必须设置默认歌词版本";
    }
    return null;
  };

  const handleSubmit = async () => {
    const error = validateBeforeSubmit();
    setSubmitError(error);
    if (error) return;
    if (isSubmitting) return;
    setIsSubmitting(true);

    const payload = {
      title,
      description,
      staff,
      coverObjectId,
      coverFilename,
      audioDefaultName,
      versions,
      lyricsVersions,
      playlistIds: selectedPlaylists.map((p) => p.id),
    };

    try {
      const url = mode === "edit" ? `/api/songs/${songId}` : "/api/songs";
      const method = mode === "edit" ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body?.error ?? "提交失败");
      }

      setSubmitSuccess(true);

      if (mode === "create") {
        // 创建模式：清空表单和草稿
        skipNextSaveRef.current = true;
        clearDraft();
        resetForm();
      } else {
        // 编辑模式：跳转回歌曲详情
        setTimeout(() => {
          router.push(`/songs/${songId}`);
        }, 1000);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "提交失败";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStaff(STAFF_TEMPLATE);
    setVersions([{ id: "ver_1", key: "主版本", objectId: "", isDefault: true, lyricsId: null }]);
    setAudioDefaultName("主版本");
    setLyricsVersions([
      { id: "lyr_1", key: "原文", isDefault: true, lines: DEFAULT_LINES, languages: ["ja"] },
    ]);
    setActiveLyricsId("lyr_1");
    setLyricsEditorKey((prev) => prev + 1);
    setUploadComponentKey((prev) => prev + 1);
    setCoverObjectId(null);
    setCoverFilename(null);
    setSelectedPlaylists([]);
    setSubmitError(null);
    setLrcText("");
    setLrcError(null);
  };

  const handleImportLrc = (content: string) => {
    if (!activeLyrics) {
      setLrcError("请选择一个歌词版本");
      return;
    }
    const parsed = parseLrc(content);
    if (!parsed.length) {
      setLrcError("未解析到有效的 LRC 行");
      return;
    }
    setLrcError(null);
    updateLyricsLines(activeLyrics.id, parsed);
    setLyricsEditorKey((prev) => prev + 1);
  };

  const isEditMode = mode === "edit";

  return (
    <>
      <Box component="main" sx={{ pb: 8 }}>
        <Container sx={{ pt: 6 }}>
          <Stack spacing={1}>
            <Typography variant="h4">
              {isEditMode ? "编辑歌曲" : "上传歌曲"}
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
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="subtitle1">Staff</Typography>
                      <Button size="small" variant="outlined" onClick={addStaff}>
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
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="subtitle1">音频版本</Typography>
                      <Button size="small" variant="outlined" onClick={addVersion}>
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
                          lyricsVersions={lyricsVersions}
                        />
                      ))}
                    </Stack>
                  </Stack>
                  <Divider />
                  <ImageUploadField
                    key={uploadComponentKey}
                    label="封面"
                    objectId={coverObjectId}
                    onObjectIdChange={(value) => {
                      setCoverObjectId(value);
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
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                      renderOption={(props, option, { selected }) => {
                        const { key, ...restProps } = props;
                        return (
                          <li key={key} {...restProps}>
                            <Checkbox
                              icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                              checkedIcon={<CheckBoxIcon fontSize="small" />}
                              style={{ marginRight: 8 }}
                              checked={selected}
                            />
                            {option.name}
                          </li>
                        );
                      }}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => {
                          const { key, ...tagProps } = getTagProps({ index });
                          return (
                            <Chip key={key} label={option.name} size="small" {...tagProps} />
                          );
                        })
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder={selectedPlaylists.length === 0 ? "选择播放列表（可选）" : ""}
                        />
                      )}
                      noOptionsText="暂无播放列表"
                    />
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            <Card className="float-in stagger-2" sx={{ overflow: "visible" }}>
              <CardContent sx={{ overflow: "visible" }}>
                <Stack spacing={2}>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                    <Stack spacing={1} flex={1}>
                      <Typography variant="h6">歌词版本</Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {lyricsVersions.map((item) => (
                          <Button
                            key={item.id}
                            variant={item.id === activeLyricsId ? "contained" : "outlined"}
                            size="small"
                            onClick={() => setActiveLyricsId(item.id)}
                          >
                            {item.key || "未命名"}
                          </Button>
                        ))}
                        <Button size="small" variant="text" onClick={addLyricsVersion}>
                          添加歌词版本
                        </Button>
                      </Stack>
                    </Stack>
                  </Stack>
                  <Divider />
                  {activeLyrics ? (
                    <Stack spacing={2}>
                      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                        <TextField
                          label="版本名称"
                          value={activeLyrics.key}
                          onChange={(event) =>
                            updateLyricsKey(activeLyrics.id, event.target.value)
                          }
                          fullWidth
                        />
                        <Autocomplete
                          multiple
                          options={["zh", "ja", "en", "ko"]}
                          value={activeLyrics.languages}
                          onChange={(_, value) => updateLyricsLanguages(activeLyrics.id, value)}
                          freeSolo
                          renderTags={(value, getTagProps) =>
                            value.map((option, index) => {
                              const { key, ...tagProps } = getTagProps({ index });
                              return (
                                <Chip key={key} label={option} size="small" {...tagProps} />
                              );
                            })
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="语言标签"
                              placeholder="选择或输入语言"
                            />
                          )}
                          sx={{ minWidth: 240 }}
                        />
                        <Button
                          variant={activeLyrics.isDefault ? "contained" : "outlined"}
                          onClick={() => setDefaultLyrics(activeLyrics.id)}
                          sx={{ height: 56, minWidth: 120 }}
                        >
                          {activeLyrics.isDefault ? "默认版本" : "设为默认"}
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
                            <Typography variant="subtitle1">导入 LRC</Typography>
                            <TextField
                              label="粘贴 LRC 内容"
                              value={lrcText}
                              onChange={(event) => setLrcText(event.target.value)}
                              multiline
                              minRows={6}
                              maxRows={6}
                              fullWidth
                              sx={{
                                "& .MuiInputBase-root": {
                                  alignItems: "flex-start",
                                  overflow: "auto",
                                },
                              }}
                            />
                            <Stack direction="row" spacing={1.5} flexWrap="wrap">
                              <Button variant="outlined" onClick={() => handleImportLrc(lrcText)}>
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
                                      const content = String(reader.result ?? "");
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
                            <Typography variant="caption" color="text.secondary">
                              导入会覆盖当前版本的歌词内容。
                            </Typography>
                          </Stack>
                        </CardContent>
                      </Card>
                      <EditorShell
                        key={`${activeLyrics.id}-${lyricsEditorKey}`}
                        initialLines={activeLyrics.lines}
                        onLinesChange={(lines) => updateLyricsLines(activeLyrics.id, lines)}
                        languages={activeLyrics.languages}
                      />
                    </Stack>
                  ) : null}
                  <Divider />
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button variant="contained" onClick={handleSubmit} disabled={isSubmitting}>
                      {isSubmitting
                        ? "提交中..."
                        : isEditMode
                          ? "保存修改"
                          : "提交上传"}
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
                        onClick={() => router.push(`/songs/${songId}`)}
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
        message={isEditMode ? "保存成功" : "提交成功"}
        onClose={() => setSubmitSuccess(false)}
      />
    </>
  );
}

// 工具函数
function uniqueName(base: string, existing: string[]) {
  const cleanedBase = base.trim() || "未命名";
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
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}_${rand}`;
}

function parseLrc(content: string): LineDraft[] {
  const lines = content.split(/\r?\n/);
  const result: LineDraft[] = [];
  const timeTag = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

  lines.forEach((line, index) => {
    const text = line.replace(timeTag, "").trim();
    let match: RegExpExecArray | null;
    let hasTime = false;
    timeTag.lastIndex = 0;
    while ((match = timeTag.exec(line))) {
      hasTime = true;
      const min = Number(match[1]);
      const sec = Number(match[2]);
      const fractionRaw = match[3] ?? "";
      const fraction =
        fractionRaw.length === 1
          ? Number(fractionRaw) * 100
          : fractionRaw.length === 2
            ? Number(fractionRaw) * 10
            : fractionRaw.length === 3
              ? Number(fractionRaw)
              : 0;
      const startMs = min * 60 * 1000 + sec * 1000 + fraction;
      result.push({
        id: `lrc_${index}_${startMs}`,
        startMs,
        text,
      });
    }
    if (!hasTime && text) {
      result.push({ id: `lrc_${index}_0`, startMs: 0, text });
    }
  });

  return result.sort((a, b) => a.startMs - b.startMs);
}
