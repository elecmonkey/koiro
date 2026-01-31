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
import VersionRow from "./VersionRow";

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
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverObjectId, setCoverObjectId] = useState<string | null>(
    initialDraft?.coverObjectId ?? null
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

  const coverUpload = useS3Upload();

  const snapshot = () => ({
    title,
    description,
    staff,
    versions,
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
                <Stack direction="row" spacing={1}>
                  <Button variant="contained">提交上传</Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      clearDraft();
                      setTitle("");
                      setDescription("");
                      setStaff(STAFF_TEMPLATE);
                      setVersions(VERSION_TEMPLATE);
                      setCoverFile(null);
                      setCoverObjectId(null);
                      setCoverFilename(null);
                    }}
                  >
                    清空草稿
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}
