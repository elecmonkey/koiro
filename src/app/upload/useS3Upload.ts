"use client";

import axios from "axios";
import { useState } from "react";

type UploadResult = {
  objectId: string;
};

type UploadState = {
  isUploading: boolean;
  error: string | null;
  objectId: string | null;
  progress: number;
};

export function useS3Upload() {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    error: null,
    objectId: null,
    progress: 0,
  });

  const upload = async (file: File, folder?: "music" | "img") => {
    setState({ isUploading: true, error: null, objectId: null, progress: 0 });

    const res = await fetch("/api/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        folder: folder ?? "",
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "上传失败" }));
      setState({
        isUploading: false,
        error: data.error ?? "上传失败",
        objectId: null,
        progress: 0,
      });
      return null;
    }

    const data = (await res.json()) as { url: string; objectId: string };

    try {
      await axios.put(data.url, file, {
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        onUploadProgress: (event) => {
          if (!event.total) return;
          const percent = Math.round((event.loaded / event.total) * 100);
          setState((prev) => ({ ...prev, progress: percent }));
        },
      });
    } catch (error) {
      setState({
        isUploading: false,
        error: "上传到对象存储失败",
        objectId: null,
        progress: 0,
      });
      return null;
    }

    const result: UploadResult = { objectId: data.objectId };
    setState({
      isUploading: false,
      error: null,
      objectId: result.objectId,
      progress: 100,
    });
    return result;
  };

  return { ...state, upload };
}
