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
  const [staff, setStaff] = useState<StaffItem[]>(STAFF_TEMPLATE);
  const [versions, setVersions] = useState<VersionItem[]>(VERSION_TEMPLATE);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [musicObjectId, setMusicObjectId] = useState<string | null>(null);
  const [coverObjectId, setCoverObjectId] = useState<string | null>(null);
  const coverPreviewUrl = useMemo(() => {
    if (!coverFile) {
      return null;
    }
    const url = URL.createObjectURL(coverFile);
    return url;
  }, [coverFile]);

  useEffect(() => {
    return () => {
      if (coverPreviewUrl) {
        URL.revokeObjectURL(coverPreviewUrl);
      }
    };
  }, [coverPreviewUrl]);
  const musicUpload = useS3Upload();
  const coverUpload = useS3Upload();
  const staffPreview = useMemo(() => {
    const entries = staff
      .filter((item) => item.role.trim() && item.name.trim())
      .map((item) => `${item.role}:${item.name}`);
    return entries.length > 0 ? `{ ${entries.join(", ")} }` : "{}";
  }, [staff]);

  const versionPreview = useMemo(() => {
    const entries = versions
      .filter((item) => item.key.trim() && item.objectId.trim())
      .map((item) => `${item.key}:${item.objectId}`);
    return entries.length > 0 ? `{ ${entries.join(", ")} }` : "{}";
  }, [versions]);

  const formatSize = (size: number) => {
    if (!size) return "";
    const mb = size / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    const kb = size / 1024;
    return `${kb.toFixed(2)} KB`;
  };

  const addStaff = () => {
    setStaff((prev) => [
      ...prev,
      { id: `staff_${prev.length + 1}`, role: "", name: "" },
    ]);
  };

  const updateStaff = (id: string, updates: Partial<StaffItem>) => {
    setStaff((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const removeStaff = (id: string) => {
    setStaff((prev) => prev.filter((item) => item.id !== id));
  };

  const addVersion = () => {
    setVersions((prev) => [
      ...prev,
      {
        id: `ver_${prev.length + 1}`,
        key: "",
        objectId: "",
        isDefault: prev.length === 0,
      },
    ]);
  };

  const updateVersion = (id: string, updates: Partial<VersionItem>) => {
    setVersions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const setDefaultVersion = (id: string) => {
    setVersions((prev) =>
      prev.map((item) => ({ ...item, isDefault: item.id === id }))
    );
  };

  const removeVersion = (id: string) => {
    setVersions((prev) => {
      const next = prev.filter((item) => item.id !== id);
      if (next.length > 0 && !next.some((item) => item.isDefault)) {
        next[0].isDefault = true;
      }
      return next;
    });
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
                          setMusicObjectId(null);
                        }}
                      />
                    </Button>
                  </Box>
                  <Stack spacing={1} sx={{ minWidth: { md: 240 } }}>
                    <Typography variant="subtitle2">当前选择</Typography>
                    <Typography variant="body2">
                      {musicFile ? musicFile.name : "未选择文件"}
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
                            setMusicObjectId(result.objectId);
                            updateVersion("ver_1", { objectId: result.objectId, key: "default" });
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
                  <TextField label="歌曲名" placeholder="例如：玻璃海" fullWidth />
                  <TextField
                    label="简介"
                    placeholder="描述这首歌的氛围、来源..."
                    fullWidth
                    multiline
                    minRows={3}
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
                              setCoverObjectId(result.objectId);
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
                <Stack direction="row" spacing={1}>
                  <Button variant="contained">提交上传</Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}
