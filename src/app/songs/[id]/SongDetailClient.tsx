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
import type { LyricsDocument, Block, Inline } from "@/app/editor/ast/types";

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
  defaultLyrics?: LyricsDocument | null;
}

export function AudioControls({ song, audioVersions, canDownload, defaultLyrics }: SongDetailClientProps) {
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

      <Stack direction="row" spacing={1.5}>
        {currentVersion && (
          <PlayButton
            track={{
              id: song.id,
              title: song.title,
              artist: song.artist,
              coverUrl: song.coverUrl,
              audioObjectId: currentVersion.objectId,
              versionKey: currentVersion.key,
              lyrics: defaultLyrics,
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

export interface LyricsVersion {
  id: string;
  versionKey: string;
  isDefault: boolean;
  content: LyricsDocument;
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

function renderLyricsBlocks(content: LyricsDocument) {
  if (!content || content.type !== "doc" || !Array.isArray(content.blocks)) {
    return (
      <Typography variant="body2" color="text.secondary">
        歌词格式异常
      </Typography>
    );
  }
  return content.blocks.map((block, index) => (
    <BlockView key={index} block={block} />
  ));
}

function BlockView({ block }: { block: Block }) {
  if (block.type === "line") {
    return (
      <Typography variant="body1" sx={{ lineHeight: 1.9 }}>
        {block.children.map((node, idx) => (
          <InlineView key={idx} node={node} />
        ))}
      </Typography>
    );
  }
  if (block.type === "p") {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.9 }}>
        {block.children.map((node, idx) => (
          <InlineView key={idx} node={node} />
        ))}
      </Typography>
    );
  }
  return null;
}

function InlineView({ node }: { node: Inline }): React.ReactNode {
  switch (node.type) {
    case "text":
      return <span>{node.text}</span>;
    case "ruby":
      return (
        <ruby>
          {node.base}
          <rt>{node.ruby}</rt>
        </ruby>
      );
    case "em":
      return (
        <em>
          {node.children.map((child, idx) => (
            <InlineView key={idx} node={child} />
          ))}
        </em>
      );
    case "strong":
      return (
        <strong>
          {node.children.map((child, idx) => (
            <InlineView key={idx} node={child} />
          ))}
        </strong>
      );
    case "annotation":
      return (
        <span title={node.note} style={{ textDecoration: "underline dotted" }}>
          {node.text}
        </span>
      );
    case "br":
      return <br />;
    default:
      return null;
  }
}
