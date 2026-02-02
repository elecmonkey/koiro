"use client";

import { useState } from "react";
import { Button, LinearProgress, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useS3Upload } from "./useS3Upload";

type VersionItem = {
  id: string;
  key: string;
  objectId: string;
  isDefault: boolean;
  lyricsId?: string | null;
};

type LyricsVersionOption = {
  id: string;
  key: string;
};

type VersionRowProps = {
  item: VersionItem;
  onChange: (id: string, updates: Partial<VersionItem>) => void;
  onRemove: (id: string) => void;
  onSetDefault: (id: string) => void;
  lyricsVersions: LyricsVersionOption[];
};

export default function VersionRow({ item, onChange, onRemove, onSetDefault, lyricsVersions }: VersionRowProps) {
  const [file, setFile] = useState<File | null>(null);
  const upload = useS3Upload();

  return (
    <Stack spacing={1.5}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
        <TextField
          label="版本名"
          value={item.key}
          onChange={(event) => onChange(item.id, { key: event.target.value })}
          fullWidth
        />
        <TextField
          select
          label="绑定歌词"
          value={item.lyricsId ?? ""}
          onChange={(event) => onChange(item.id, { lyricsId: event.target.value || null })}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">无歌词</MenuItem>
          {lyricsVersions.map((lyr) => (
            <MenuItem key={lyr.id} value={lyr.id}>
              {lyr.key}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant={item.isDefault ? "contained" : "outlined"}
          onClick={() => onSetDefault(item.id)}
          sx={{ minWidth: 64, whiteSpace: "nowrap", height: 56 }}
        >
          默认
        </Button>
        <Button color="error" onClick={() => onRemove(item.id)} sx={{ height: 56 }}>
          删除
        </Button>
      </Stack>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
        <Button variant="outlined" component="label">
          选择音频
          <input
            hidden
            type="file"
            accept="audio/*"
            onChange={(event) => {
              const next = event.target.files?.[0] ?? null;
              setFile(next);
            }}
          />
        </Button>
        <Typography variant="body2">
          {file ? file.name : "未选择文件"}
        </Typography>
        <Button
          variant="contained"
          disabled={!file || upload.isUploading}
          onClick={async () => {
            if (!file) return;
            const result = await upload.upload(file, "music");
            if (result?.objectId) {
              onChange(item.id, { objectId: result.objectId });
            }
          }}
        >
          {upload.isUploading ? "上传中..." : "上传音频"}
        </Button>
        {file ? (
          <Button variant="text" onClick={() => setFile(null)}>
            清除
          </Button>
        ) : null}
      </Stack>
      {item.objectId ? (
        <Typography variant="caption" color="text.secondary">
          已上传
        </Typography>
      ) : null}
      {upload.isUploading ? (
        <Stack spacing={0.5}>
          <LinearProgress variant="determinate" value={upload.progress} />
          <Typography variant="caption" color="text.secondary">
            上传中 · {upload.progress}%
          </Typography>
        </Stack>
      ) : null}
      {upload.error ? (
        <Typography variant="caption" color="error">
          {upload.error}
        </Typography>
      ) : null}
    </Stack>
  );
}
