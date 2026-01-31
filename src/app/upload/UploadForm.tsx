"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import EditorShell from "../editor/EditorShell";
import { clearDraft, loadDraft, saveDraft } from "./draftStore";
import VersionRow from "./VersionRow";
import ImageUploadField from "../components/ImageUploadField";
import type { LineDraft } from "../editor/state/useLyricsEditor";

type StaffItem = {
  id: string;
  role: string;
  name: string;
};

type VersionItem = {
  id: string;
  key: string;
  objectId: string;
  isDefault: boolean;
};

type LyricsVersion = {
  id: string;
  key: string;
  isDefault: boolean;
  lines: LineDraft[];
};

const STAFF_TEMPLATE: StaffItem[] = [
  { id: "staff_1", role: "作词", name: "" },
  { id: "staff_2", role: "演唱", name: "" },
];

const VERSION_TEMPLATE: VersionItem[] = [
  { id: "ver_1", key: "主版本", objectId: "", isDefault: true },
];

const DEFAULT_LINES: LineDraft[] = [
  { id: "line_1", startMs: 10500, endMs: 14200, text: "君/の声が" },
  { id: "line_2", startMs: 16800, text: "世界を変える" },
];

export default function UploadForm() {
  const initialDraft = useMemo(() => loadDraft(), []);
  const [staff, setStaff] = useState<StaffItem[]>(
    initialDraft?.staff?.length ? initialDraft.staff : STAFF_TEMPLATE
  );
  const [versions, setVersions] = useState<VersionItem[]>(
    initialDraft?.versions?.length ? initialDraft.versions : VERSION_TEMPLATE
  );
  const [audioDefaultName, setAudioDefaultName] = useState<string | null>(
    initialDraft?.audioDefaultName ??
      (initialDraft?.versions?.find((v) => v.isDefault)?.key ?? VERSION_TEMPLATE[0].key)
  );
  const [title, setTitle] = useState(initialDraft?.title ?? "");
  const [description, setDescription] = useState(initialDraft?.description ?? "");
  const [coverObjectId, setCoverObjectId] = useState<string | null>(
    initialDraft?.coverObjectId ?? null
  );
  const [coverFilename, setCoverFilename] = useState<string | null>(
    initialDraft?.coverFilename ?? null
  );
  const [lyricsVersions, setLyricsVersions] = useState<LyricsVersion[]>(
    initialDraft?.lyricsVersions?.length
      ? initialDraft.lyricsVersions
      : [{ id: "lyr_1", key: "原文", isDefault: true, lines: DEFAULT_LINES }]
  );
  const [activeLyricsId, setActiveLyricsId] = useState<string>(
    initialDraft?.lyricsVersions?.[0]?.id ?? "lyr_1"
  );
  const [submitError, setSubmitError] = useState<string | null>(null);

  const snapshot = () => ({
    title,
    description,
    staff,
    versions,
    audioDefaultName,
    lyricsVersions,
    coverObjectId,
    coverFilename,
  });

  const commitDraft = (next: Partial<ReturnType<typeof snapshot>>) => {
    const data = { ...snapshot(), ...next };
    saveDraft(data);
  };

  const addStaff = () => {
    const next = [...staff, { id: `staff_${staff.length + 1}`, role: "", name: "" }];
    setStaff(next);
    commitDraft({ staff: next });
  };

  const updateStaff = (id: string, updates: Partial<StaffItem>) => {
    const next = staff.map((item) => (item.id === id ? { ...item, ...updates } : item));
    setStaff(next);
    commitDraft({ staff: next });
  };

  const removeStaff = (id: string) => {
    const next = staff.filter((item) => item.id !== id);
    setStaff(next);
    commitDraft({ staff: next });
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
      },
    ];
    setVersions(next);
    commitDraft({ versions: next });
  };

  const updateVersion = (id: string, updates: Partial<VersionItem>) => {
    let nextKey = updates.key;
    if (typeof nextKey === "string") {
      nextKey = uniqueName(nextKey, versions.map((v) => v.key), id);
    }
    const next = versions.map((item) =>
      item.id === id ? { ...item, ...updates, key: nextKey ?? item.key } : item
    );
    setVersions(next);
    if (updates.key && next.find((v) => v.id === id)?.isDefault) {
      setAudioDefaultName(next.find((v) => v.id === id)?.key ?? null);
      commitDraft({ versions: next, audioDefaultName: next.find((v) => v.id === id)?.key ?? null });
      return;
    }
    commitDraft({ versions: next });
  };

  const setDefaultVersion = (id: string) => {
    const next = versions.map((item) => ({ ...item, isDefault: item.id === id }));
    const defaultName = next.find((item) => item.id === id)?.key ?? null;
    setVersions(next);
    setAudioDefaultName(defaultName && defaultName.length > 0 ? defaultName : null);
    commitDraft({ versions: next, audioDefaultName: defaultName ?? null });
  };

  const removeVersion = (id: string) => {
    const next = versions.filter((item) => item.id !== id);
    if (next.length > 0 && !next.some((item) => item.isDefault)) {
      next[0].isDefault = true;
      setAudioDefaultName(next[0].key || null);
    }
    setVersions(next);
    commitDraft({ versions: next, audioDefaultName: next.find((v) => v.isDefault)?.key ?? null });
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
      },
    ];
    setLyricsVersions(next);
    setActiveLyricsId(next[next.length - 1].id);
    commitDraft({ lyricsVersions: next });
  };

  const updateLyricsKey = (id: string, key: string) => {
    const nextKey = uniqueName(key, lyricsVersions.map((v) => v.key), id);
    const next = lyricsVersions.map((item) =>
      item.id === id ? { ...item, key: nextKey } : item
    );
    setLyricsVersions(next);
    commitDraft({ lyricsVersions: next });
  };

  const setDefaultLyrics = (id: string) => {
    const next = lyricsVersions.map((item) => ({ ...item, isDefault: item.id === id }));
    setLyricsVersions(next);
    commitDraft({ lyricsVersions: next });
  };

  const removeLyricsVersion = (id: string) => {
    const next = lyricsVersions.filter((item) => item.id !== id);
    if (next.length > 0 && !next.some((item) => item.isDefault)) {
      next[0].isDefault = true;
    }
    setLyricsVersions(next);
    setActiveLyricsId(next[0]?.id ?? "");
    commitDraft({ lyricsVersions: next });
  };

  const updateLyricsLines = (id: string, lines: LineDraft[]) => {
    const next = lyricsVersions.map((item) =>
      item.id === id ? { ...item, lines } : item
    );
    setLyricsVersions(next);
    commitDraft({ lyricsVersions: next });
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

  const handleSubmit = () => {
    const error = validateBeforeSubmit();
    setSubmitError(error);
    if (error) return;
    // TODO: 调用后端提交接口，成功后再 clearDraft
  };

  function uniqueName(base: string, existing: string[], excludeId?: string) {
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

  return (
    <Box component="main" sx={{ pb: 8 }}>
      <Container sx={{ pt: 6 }}>
        <Stack spacing={1}>
          <Typography variant="h4">上传歌曲</Typography>
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
                      commitDraft({ title: next });
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
                      commitDraft({ description: next });
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
                      <Stack key={item.id} direction={{ xs: "column", md: "row" }} spacing={1}>
                        <TextField
                          label="职责"
                          value={item.role}
                          onChange={(event) => updateStaff(item.id, { role: event.target.value })}
                          fullWidth
                        />
                        <TextField
                          label="姓名"
                          value={item.name}
                          onChange={(event) => updateStaff(item.id, { name: event.target.value })}
                          fullWidth
                        />
                        <Button color="error" onClick={() => removeStaff(item.id)}>
                          删除
                        </Button>
                      </Stack>
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
                        key={item.id}
                        item={item}
                        onChange={updateVersion}
                        onRemove={removeVersion}
                        onSetDefault={setDefaultVersion}
                      />
                    ))}
                  </Stack>
                </Stack>
                <Divider />
                <ImageUploadField
                  label="封面"
                  objectId={coverObjectId}
                  onObjectIdChange={(value) => {
                    setCoverObjectId(value);
                    commitDraft({ coverObjectId: value });
                  }}
                  onFilenameChange={(value) => {
                    setCoverFilename(value);
                    commitDraft({ coverFilename: value });
                  }}
                />
              </Stack>
            </CardContent>
          </Card>

          <Card className="float-in stagger-2">
            <CardContent>
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
                        onChange={(event) => updateLyricsKey(activeLyrics.id, event.target.value)}
                        fullWidth
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
                    <EditorShell
                      key={activeLyrics.id}
                      initialLines={activeLyrics.lines}
                      onLinesChange={(lines) => updateLyricsLines(activeLyrics.id, lines)}
                    />
                  </Stack>
                ) : null}
                <Divider />
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button variant="contained" onClick={handleSubmit}>
                    提交上传
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      clearDraft();
                      setTitle("");
                      setDescription("");
                      setStaff(STAFF_TEMPLATE);
                      setVersions(VERSION_TEMPLATE);
                      setAudioDefaultName(VERSION_TEMPLATE[0].key);
                      setLyricsVersions([
                        { id: "lyr_1", key: "原文", isDefault: true, lines: DEFAULT_LINES },
                      ]);
                      setActiveLyricsId("lyr_1");
                      setCoverObjectId(null);
                      setCoverFilename(null);
                      setSubmitError(null);
                    }}
                  >
                    清空草稿
                  </Button>
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
  );
}
