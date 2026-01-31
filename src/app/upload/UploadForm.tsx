"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import EditorShell from "../editor/EditorShell";
import { useS3Upload } from "./useS3Upload";
import { clearDraft, loadDraft, saveDraft } from "./draftStore";

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

const STAFF_TEMPLATE: StaffItem[] = [
  { id: "staff_1", role: "作词", name: "" },
  { id: "staff_2", role: "演唱", name: "" },
];

const VERSION_TEMPLATE: VersionItem[] = [
  { id: "ver_1", key: "default", objectId: "", isDefault: true },
];

export default function UploadForm() {
  const initialDraft = useMemo(() => loadDraft(), []);
  const [staff, setStaff] = useState<StaffItem[]>(
    initialDraft?.staff?.length ? initialDraft.staff : STAFF_TEMPLATE
  );
  const [versions, setVersions] = useState<VersionItem[]>(
    initialDraft?.versions?.length ? initialDraft.versions : VERSION_TEMPLATE
  );
  const [title, setTitle] = useState(initialDraft?.title ?? "");
  const [description, setDescription] = useState(initialDraft?.description ?? "");
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [musicObjectId, setMusicObjectId] = useState<string | null>(
    initialDraft?.musicObjectId ?? null
  );
  const [coverObjectId, setCoverObjectId] = useState<string | null>(
    initialDraft?.coverObjectId ?? null
  );
  const [musicFilename, setMusicFilename] = useState<string | null>(
    initialDraft?.musicFilename ?? null
  );
  const [coverFilename, setCoverFilename] = useState<string | null>(
    initialDraft?.coverFilename ?? null
  );
  const coverPreviewUrl = useMemo(() => {
    if (!coverFile) {
      return null;
    }
    return URL.createObjectURL(coverFile);
  }, [coverFile]);

  useEffect(() => {
    return () => {
      if (coverPreviewUrl) {
        URL.revokeObjectURL(coverPreviewUrl);
      }
    };
  }, [coverPreviewUrl]);

  const commitDraft = (next: Partial<ReturnType<typeof snapshot>>) => {
    const data = { ...snapshot(), ...next };
    saveDraft(data);
  };

  const musicUpload = useS3Upload();
  const coverUpload = useS3Upload();

  const snapshot = () => ({
    title,
    description,
    staff,
    versions,
    coverObjectId,
    musicObjectId,
    musicFilename,
    coverFilename,
  });

  const formatSize = (size: number) => {
    if (!size) return "";
    const mb = size / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    const kb = size / 1024;
    return `${kb.toFixed(2)} KB`;
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
    const next = [
      ...versions,
      {
        id: `ver_${versions.length + 1}`,
        key: "",
        objectId: "",
        isDefault: versions.length === 0,
      },
    ];
    setVersions(next);
    commitDraft({ versions: next });
  };

  const updateVersion = (id: string, updates: Partial<VersionItem>) => {
    const next = versions.map((item) => (item.id === id ? { ...item, ...updates } : item));
    setVersions(next);
    commitDraft({ versions: next });
  };

  const setDefaultVersion = (id: string) => {
    const next = versions.map((item) => ({ ...item, isDefault: item.id === id }));
    setVersions(next);
    commitDraft({ versions: next });
  };

  const removeVersion = (id: string) => {
    const next = versions.filter((item) => item.id !== id);
    if (next.length > 0 && !next.some((item) => item.isDefault)) {
      next[0].isDefault = true;
    }
    setVersions(next);
    commitDraft({ versions: next });
  };

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
              <Stack spacing={2}>
                <Typography variant="h6">音频文件</Typography>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={2}
                  alignItems={{ xs: "stretch", md: "center" }}
                >
                  <Box
                    sx={{
                      border: "1px dashed rgba(31, 26, 22, 0.25)",
                      p: 3,
                      flex: 1,
                      textAlign: "center",
                      background: "#fff",
                    }}
                  >
                    <Typography variant="subtitle1">拖拽文件到此处</Typography>
                    <Typography variant="body2" color="text.secondary">
                      支持 WAV / FLAC / MP3，最大 500MB
                    </Typography>
                    <Button variant="outlined" component="label" sx={{ mt: 2 }}>
                      选择文件
                      <input
                        hidden
                        type="file"
                        accept="audio/*"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          setMusicFile(file);
                          const nextName = file ? file.name : null;
                          setMusicFilename(nextName);
                          setMusicObjectId(null);
                          commitDraft({ musicFilename: nextName, musicObjectId: null });
                        }}
                      />
                    </Button>
                  </Box>
                  <Stack spacing={1} sx={{ minWidth: { md: 240 } }}>
                    <Typography variant="subtitle2">当前选择</Typography>
                    <Typography variant="body2">
                      {musicFile ? musicFile.name : musicFilename ?? "未选择文件"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {musicFile ? formatSize(musicFile.size) : ""}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        disabled={!musicFile || musicUpload.isUploading}
                        onClick={async () => {
                          if (!musicFile) return;
                          const result = await musicUpload.upload(musicFile, "music");
                          if (result?.objectId) {
                            const nextObjectId = result.objectId;
                            const nextVersions = versions.map((item) =>
                              item.id === "ver_1"
                                ? { ...item, objectId: nextObjectId, key: "default" }
                                : item
                            );
                            setMusicObjectId(nextObjectId);
                            setVersions(nextVersions);
                            commitDraft({
                              musicObjectId: nextObjectId,
                              versions: nextVersions,
                            });
                          }
                        }}
                      >
                        {musicUpload.isUploading ? "上传中..." : "上传音频"}
                      </Button>
                      {musicFile ? (
                        <Button
                          variant="text"
                          onClick={() => {
                            setMusicFile(null);
                            setMusicObjectId(null);
                            setMusicFilename(null);
                            commitDraft({ musicFilename: null, musicObjectId: null });
                          }}
                        >
                          清除
                        </Button>
                      ) : null}
                    </Stack>
                    {musicUpload.isUploading ? (
                      <Stack spacing={0.5}>
                        <LinearProgress variant="determinate" value={musicUpload.progress} />
                        <Typography variant="caption" color="text.secondary">
                          上传中 · {musicUpload.progress}%
                        </Typography>
                      </Stack>
                    ) : null}
                    {musicObjectId ? (
                      <Typography variant="caption" color="text.secondary">
                        已上传：{musicObjectId}
                      </Typography>
                    ) : null}
                    {musicUpload.error ? (
                      <Typography variant="caption" color="error">
                        {musicUpload.error}
                      </Typography>
                    ) : null}
                  </Stack>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card className="float-in stagger-1">
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
                    <Typography variant="subtitle1">版本列表</Typography>
                    <Button size="small" variant="outlined" onClick={addVersion}>
                      添加版本
                    </Button>
                  </Stack>
                  <Stack spacing={1.5}>
                    {versions.map((item) => (
                      <Stack key={item.id} direction={{ xs: "column", md: "row" }} spacing={1}>
                        <TextField
                          label="版本名"
                          value={item.key}
                          onChange={(event) => updateVersion(item.id, { key: event.target.value })}
                          fullWidth
                        />
                        <TextField
                          label="对象 ID"
                          value={item.objectId}
                          onChange={(event) =>
                            updateVersion(item.id, { objectId: event.target.value })
                          }
                          placeholder="music/xxx"
                          fullWidth
                        />
                        <Button
                          variant={item.isDefault ? "contained" : "outlined"}
                          onClick={() => setDefaultVersion(item.id)}
                        >
                          默认
                        </Button>
                        <Button color="error" onClick={() => removeVersion(item.id)}>
                          删除
                        </Button>
                      </Stack>
                    ))}
                  </Stack>
                </Stack>
                <Divider />
                <Stack spacing={1.5}>
                  <Typography variant="subtitle1">封面</Typography>
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={2}
                    alignItems={{ xs: "stretch", md: "center" }}
                  >
                    <Box
                      sx={{
                        width: 180,
                        height: 180,
                        border: "1px dashed rgba(31, 26, 22, 0.25)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#fff",
                        overflow: "hidden",
                      }}
                    >
                      {coverPreviewUrl ? (
                        <Box
                          component="img"
                          src={coverPreviewUrl}
                          alt="封面预览"
                          sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          暂无封面
                        </Typography>
                      )}
                    </Box>
                    <Stack spacing={1.5} flex={1}>
                      <Stack direction="row" spacing={1.5} flexWrap="wrap">
                        <Button variant="outlined" component="label">
                          选择封面
                          <input
                            hidden
                            type="file"
                            accept="image/*"
                            onChange={(event) => {
                              const file = event.target.files?.[0] ?? null;
                              setCoverFile(file);
                              const nextName = file ? file.name : null;
                              setCoverFilename(nextName);
                              commitDraft({ coverFilename: nextName });
                            }}
                          />
                        </Button>
                        <Button
                          variant="contained"
                          disabled={!coverFile || coverUpload.isUploading}
                          onClick={async () => {
                            if (!coverFile) return;
                            const result = await coverUpload.upload(coverFile, "img");
                            if (result?.objectId) {
                              const nextObjectId = result.objectId;
                              setCoverObjectId(nextObjectId);
                              commitDraft({ coverObjectId: nextObjectId });
                            }
                          }}
                        >
                          {coverUpload.isUploading ? "上传中..." : "上传封面"}
                        </Button>
                        {coverFile ? (
                          <Button
                            variant="text"
                            onClick={() => {
                              setCoverFile(null);
                              setCoverObjectId(null);
                              setCoverFilename(null);
                              commitDraft({ coverFilename: null, coverObjectId: null });
                            }}
                          >
                            清除选择
                          </Button>
                        ) : null}
                      </Stack>
                      {coverUpload.isUploading ? (
                        <Stack spacing={0.5}>
                          <LinearProgress variant="determinate" value={coverUpload.progress} />
                          <Typography variant="caption" color="text.secondary">
                            上传中 · {coverUpload.progress}%
                          </Typography>
                        </Stack>
                      ) : null}
                      <Typography variant="caption" color="text.secondary">
                        建议尺寸：1:1 或 4:3，最大 30MB，支持 PNG/JPG/WebP。
                      </Typography>
                      {coverObjectId ? (
                        <Typography variant="caption" color="text.secondary">
                          已上传：{coverObjectId}
                        </Typography>
                      ) : null}
                      {coverUpload.error ? (
                        <Typography variant="caption" color="error">
                          {coverUpload.error}
                        </Typography>
                      ) : null}
                    </Stack>
                  </Stack>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card className="float-in stagger-2">
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">歌词与预览</Typography>
                <EditorShell />
                <Divider />
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.5}
                  alignItems={{ xs: "stretch", sm: "center" }}
                  justifyContent="space-between"
                >
                  <Stack direction="row" spacing={1.5}>
                    <Button variant="contained">提交上传</Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        clearDraft();
                        setTitle("");
                        setDescription("");
                        setStaff(STAFF_TEMPLATE);
                        setVersions(VERSION_TEMPLATE);
                        setMusicFile(null);
                        setCoverFile(null);
                        setMusicObjectId(null);
                        setCoverObjectId(null);
                        setMusicFilename(null);
                        setCoverFilename(null);
                      }}
                    >
                      清空草稿
                    </Button>
                  </Stack>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}
