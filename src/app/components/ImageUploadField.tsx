"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Button, LinearProgress, Stack, TextField, Typography } from "@mui/material";
import { useS3Upload } from "../upload/useS3Upload";

type ImageUploadFieldProps = {
  label?: string;
  helperText?: string;
  objectId: string | null;
  onObjectIdChange: (value: string | null) => void;
  onFilenameChange?: (value: string | null) => void;
};

export default function ImageUploadField({
  label = "封面",
  helperText = "建议尺寸：1:1 或 4:3，最大 30MB，支持 PNG/JPG/WebP。",
  objectId,
  onObjectIdChange,
  onFilenameChange,
}: ImageUploadFieldProps) {
  const [file, setFile] = useState<File | null>(null);
  const [remoteUrl, setRemoteUrl] = useState("");
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [isFetchingRemote, setIsFetchingRemote] = useState(false);
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(null);
  const upload = useS3Upload();

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle1">{label}</Typography>
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
          {previewUrl || uploadedPreviewUrl ? (
            <Box
              component="img"
              src={previewUrl ?? uploadedPreviewUrl ?? ""}
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
              选择图片
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const next = event.target.files?.[0] ?? null;
                  setFile(next);
                  onFilenameChange?.(next ? next.name : null);
                }}
              />
            </Button>
            <Button
              variant="contained"
              disabled={!file || upload.isUploading}
              onClick={async () => {
                if (!file) return;
                const result = await upload.upload(file, "img");
                if (result?.objectId) {
                  onObjectIdChange(result.objectId);
                  const preview = await fetchPreviewUrl(result.objectId);
                  if (preview) {
                    setUploadedPreviewUrl(preview);
                  }
                }
              }}
            >
              {upload.isUploading ? "上传中..." : "上传封面"}
            </Button>
            {file ? (
              <Button
                variant="text"
                onClick={() => {
                  setFile(null);
                  onObjectIdChange(null);
                  onFilenameChange?.(null);
                  setUploadedPreviewUrl(null);
                }}
              >
                清除选择
              </Button>
            ) : null}
          </Stack>
          <Stack spacing={1} sx={{ maxWidth: 520 }}>
            <TextField
              label="远程图片 URL"
              placeholder="https://example.com/cover.png"
              value={remoteUrl}
              onChange={(event) => setRemoteUrl(event.target.value)}
              size="small"
              fullWidth
            />
            <Stack direction="row" spacing={1.5} flexWrap="wrap">
              <Button
                variant="outlined"
                disabled={!remoteUrl.trim() || isFetchingRemote || upload.isUploading}
                onClick={async () => {
                  const url = remoteUrl.trim();
                  if (!url) return;
                  setRemoteError(null);
                  setIsFetchingRemote(true);
                  try {
                    const res = await fetch("/api/upload-remote", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ url, folder: "img" }),
                    });
                    if (!res.ok) {
                      const body = (await res.json()) as { error?: string };
                      throw new Error(body?.error ?? `拉取失败：${res.status}`);
                    }
                    const data = (await res.json()) as { objectId: string };
                    if (data?.objectId) {
                      onObjectIdChange(data.objectId);
                      onFilenameChange?.(filenameFromUrl(url));
                      const preview = await fetchPreviewUrl(data.objectId);
                      if (preview) {
                        setUploadedPreviewUrl(preview);
                      }
                      setFile(null);
                    }
                  } catch (error) {
                    const message =
                      error instanceof Error ? error.message : "拉取失败，请检查链接或权限。";
                    setRemoteError(message);
                  } finally {
                    setIsFetchingRemote(false);
                  }
                }}
              >
                {isFetchingRemote ? "拉取中..." : "从 URL 上传"}
              </Button>
              <Button
                variant="text"
                disabled={!remoteUrl}
                onClick={() => {
                  setRemoteUrl("");
                  setRemoteError(null);
                }}
              >
                清除链接
              </Button>
            </Stack>
            {remoteError ? (
              <Typography variant="caption" color="error">
                {remoteError}
              </Typography>
            ) : null}
          </Stack>
          {upload.isUploading || isFetchingRemote ? (
            <Stack spacing={0.5}>
              <LinearProgress variant="determinate" value={upload.progress} />
              <Typography variant="caption" color="text.secondary">
                {upload.isUploading ? `上传中 · ${upload.progress}%` : "正在拉取远程图片"}
              </Typography>
            </Stack>
          ) : null}
          <Typography variant="caption" color="text.secondary">
            {helperText}
          </Typography>
          {objectId ? (
            <Typography variant="caption" color="text.secondary">
              已上传
            </Typography>
          ) : null}
          {upload.error ? (
            <Typography variant="caption" color="error">
              {upload.error}
            </Typography>
          ) : null}
        </Stack>
      </Stack>
    </Stack>
  );
}

function filenameFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    const base = parsed.pathname.split("/").pop();
    if (base && base.includes(".")) {
      return base;
    }
  } catch {
    // ignore
  }
  return "remote-image.jpg";
}

async function fetchPreviewUrl(objectId: string) {
  try {
    const res = await fetch("/api/object-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objectId }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { url?: string };
    return data.url ?? null;
  } catch {
    return null;
  }
}
