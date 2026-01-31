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
  const [coverObjectId, setCoverObjectId] = useState<string | null>(
    initialDraft?.coverObjectId ?? null
  );
  const [coverFilename, setCoverFilename] = useState<string | null>(
    initialDraft?.coverFilename ?? null
  );

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
