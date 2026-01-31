"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Button, LinearProgress, Stack, Typography } from "@mui/material";
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
          {previewUrl ? (
            <Box
              component="img"
              src={previewUrl}
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
                }}
              >
                清除选择
              </Button>
            ) : null}
          </Stack>
          {upload.isUploading ? (
            <Stack spacing={0.5}>
              <LinearProgress variant="determinate" value={upload.progress} />
              <Typography variant="caption" color="text.secondary">
                上传中 · {upload.progress}%
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
