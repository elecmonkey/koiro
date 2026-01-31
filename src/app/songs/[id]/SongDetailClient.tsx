"use client";

import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { PlayButton } from "@/app/components/PlayButton";
import { Download } from "@mui/icons-material";

export interface AudioVersion {
  key: string;
  objectId: string;
  isDefault: boolean;
}

export interface SongDetailClientProps {
  song: {
    id: string;
    title: string;
    artist?: string;
    coverUrl: string | null;
  };
  audioVersions: AudioVersion[];
  canDownload: boolean;
}

export function AudioControls({ song, audioVersions, canDownload }: SongDetailClientProps) {
  const [selectedVersion, setSelectedVersion] = useState(() => {
    const defaultIdx = audioVersions.findIndex((v) => v.isDefault);
    return defaultIdx >= 0 ? defaultIdx : 0;
  });

  const currentVersion = audioVersions[selectedVersion];

  const handleDownload = async () => {
    if (!currentVersion || !canDownload) return;
    
    try {
      const res = await fetch("/api/object-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectId: currentVersion.objectId }),
      });
      if (!res.ok) throw new Error("获取下载链接失败");
      const { url } = await res.json();
      
      // 创建临时链接并触发下载
      const a = document.createElement("a");
      a.href = url;
      a.download = `${song.title} - ${currentVersion.key}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  if (audioVersions.length === 0) {
    return (
      <Button variant="contained" disabled>
        无音频
      </Button>
    );
  }

  return (
    <Stack spacing={2}>
      {/* 版本切换 Tabs（只在有多个版本时显示） */}
      {audioVersions.length > 1 && (
        <Tabs
          value={selectedVersion}
          onChange={(_, v) => setSelectedVersion(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {audioVersions.map((v, idx) => (
            <Tab
              key={v.key}
              label={v.isDefault ? `${v.key}（默认）` : v.key}
              value={idx}
            />
          ))}
        </Tabs>
      )}

      {/* 播放和下载按钮 */}
      <Stack direction="row" spacing={1.5}>
        {currentVersion && (
          <PlayButton
            track={{
              id: song.id,
              title: song.title,
              artist: song.artist,
              coverUrl: song.coverUrl,
              audioObjectId: currentVersion.objectId,
            }}
          />
        )}
        <Button
          variant="outlined"
          disabled={!canDownload || !currentVersion}
          onClick={handleDownload}
          startIcon={<Download />}
        >
          下载{audioVersions.length > 1 ? ` (${currentVersion?.key})` : ""}
        </Button>
      </Stack>
    </Stack>
  );
}

// 歌词相关类型
type LyricsContent = {
  type: "doc";
  blocks: Array<
    | {
        type: "line";
        time?: { startMs: number; endMs?: number };
        children: InlineNode[];
      }
    | { type: "p"; children: InlineNode[] }
  >;
};

type InlineNode =
  | { type: "text"; text: string }
  | { type: "ruby"; base: string; ruby: string }
  | { type: "em"; children: InlineNode[] }
  | { type: "strong"; children: InlineNode[] }
  | { type: "annotation"; text: string; note: string }
  | { type: "br" };

export interface LyricsVersion {
  id: string;
  versionKey: string;
  isDefault: boolean;
  content: LyricsContent;
}

interface LyricsDisplayProps {
  lyrics: LyricsVersion[];
}

export function LyricsDisplay({ lyrics }: LyricsDisplayProps) {
  const [selectedLyrics, setSelectedLyrics] = useState(() => {
    const defaultIdx = lyrics.findIndex((l) => l.isDefault);
    return defaultIdx >= 0 ? defaultIdx : 0;
  });

  const currentLyrics = lyrics[selectedLyrics];

  return (
    <Card className="float-in">
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Typography variant="h6">歌词</Typography>
          </Stack>

          {lyrics.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              暂无歌词
            </Typography>
          ) : (
            <>
              {/* 歌词版本切换 Tabs（只在有多个版本时显示） */}
              {lyrics.length > 1 && (
                <Tabs
                  value={selectedLyrics}
                  onChange={(_, v) => setSelectedLyrics(v)}
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  {lyrics.map((l, idx) => (
                    <Tab
                      key={l.id}
                      label={l.isDefault ? `${l.versionKey}（默认）` : l.versionKey}
                      value={idx}
                    />
                  ))}
                </Tabs>
              )}

              {/* 歌词内容 */}
              {currentLyrics && (
                <Stack spacing={1}>
                  {renderLyricsBlocks(currentLyrics.content)}
                </Stack>
              )}
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

function renderLyricsBlocks(content: LyricsContent) {
  if (!content || content.type !== "doc" || !Array.isArray(content.blocks)) {
    return (
      <Typography variant="body2" color="text.secondary">
        歌词格式异常
      </Typography>
    );
  }
  return content.blocks.map((block, index) => {
    if (block.type === "line") {
      return (
        <Typography key={`line-${index}`} variant="body1" sx={{ lineHeight: 1.9 }}>
          {block.children.map((node, idx) => renderInline(node, `line-${index}-${idx}`))}
        </Typography>
      );
    }
    if (block.type === "p") {
      return (
        <Typography
          key={`p-${index}`}
          variant="body2"
          color="text.secondary"
          sx={{ lineHeight: 1.9 }}
        >
          {block.children.map((node, idx) => renderInline(node, `p-${index}-${idx}`))}
        </Typography>
      );
    }
    return null;
  });
}

function renderInline(node: InlineNode, key: string): React.ReactNode {
  switch (node.type) {
    case "text":
      return <span key={key}>{node.text}</span>;
    case "ruby":
      return (
        <ruby key={key}>
          {node.base}
          <rt>{node.ruby}</rt>
        </ruby>
      );
    case "em":
      return (
        <em key={key}>
          {node.children.map((child, idx) => renderInline(child, `${key}-${idx}`))}
        </em>
      );
    case "strong":
      return (
        <strong key={key}>
          {node.children.map((child, idx) => renderInline(child, `${key}-${idx}`))}
        </strong>
      );
    case "annotation":
      return (
        <span key={key} title={node.note} style={{ textDecoration: "underline dotted" }}>
          {node.text}
        </span>
      );
    case "br":
      return <br key={key} />;
    default:
      return null;
  }
}
