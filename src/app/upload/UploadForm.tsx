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
          <Typography variant="body2" color="text.secondary">
            支持上传音频后自动转码为 HLS 流
          </Typography>
        </Stack>
      </Container>

      <Container sx={{ pt: 4 }}>
        <Stack spacing={3}>
          <Card className="float-in">
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">音频文件</Typography>
                <Box
                  sx={{
                    border: "1px dashed rgba(31, 26, 22, 0.25)",
                    borderRadius: 3,
                    p: 4,
                    textAlign: "center",
                  }}
                >
                  <Typography variant="subtitle1">拖拽文件到此处</Typography>
                  <Typography variant="body2" color="text.secondary">
                    或选择本地音频文件（WAV / FLAC / MP3）
                  </Typography>
                  <Button variant="outlined" sx={{ mt: 2 }}>
                    选择文件
                  </Button>
                </Box>
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
                  <Typography variant="caption" color="text.secondary">
                    预览：{staffPreview}
                  </Typography>
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
                  <Typography variant="caption" color="text.secondary">
                    预览：{versionPreview}
                  </Typography>
                </Stack>
                <Divider />
                <Stack spacing={1.5}>
                  <Typography variant="subtitle1">封面</Typography>
                  <TextField label="封面对象 ID" placeholder="img/xxx" fullWidth />
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
