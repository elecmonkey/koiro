"use client";

import { Box, Divider, IconButton, Paper, Slider, Stack, Typography } from "@mui/material";
import {
  PlayArrow,
  Pause,
  Close,
  ExpandLess,
  ExpandMore,
  MusicNote,
  OpenInNew,
} from "@mui/icons-material";
import Link from "next/link";
import { usePlayer } from "./PlayerContext";
import { useLyricsSync } from "./useLyricsSync";
import { LyricsDisplay } from "./LyricsDisplay";

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function FloatingPlayer() {
  const {
    track,
    isPlaying,
    currentTime,
    duration,
    isLoading,
    isMinimized,
    pause,
    resume,
    stop,
    seek,
    toggleMinimize,
  } = usePlayer();

  // 歌词同步
  const { prevLine, currentLine, nextLine, isPreview } = useLyricsSync(track?.lyrics, currentTime);

  // 没有曲目时不显示
  if (!track) return null;

  return (
    <Paper
      elevation={8}
      sx={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 1300,
        borderRadius: 2,
        overflow: "hidden",
        minWidth: isMinimized ? "auto" : 320,
        maxWidth: isMinimized ? "auto" : 360,
        transition: "all 0.3s ease",
      }}
    >
      {/* 收起状态：播放按钮 + 展开按钮 */}
      {isMinimized ? (
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ p: 1 }}>
          <IconButton
            onClick={isPlaying ? pause : resume}
            color="primary"
            sx={{
              bgcolor: "primary.light",
              color: "white",
              "&:hover": { bgcolor: "primary.main" },
            }}
          >
            {isPlaying ? <Pause /> : <PlayArrow />}
          </IconButton>
          <IconButton size="small" onClick={toggleMinimize} title="展开">
            <ExpandLess fontSize="small" />
          </IconButton>
        </Stack>
      ) : (
        <Stack>
          {/* 头部：封面、标题、控制按钮 */}
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ p: 1.5, pb: 1 }}>
            {/* 封面 */}
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 1,
                bgcolor: "grey.200",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {track.coverUrl ? (
                <Box
                  component="img"
                  src={track.coverUrl}
                  alt={track.title}
                  sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <MusicNote sx={{ color: "grey.400" }} />
              )}
            </Box>

            {/* 标题和艺术家 */}
            <Stack sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body2"
                fontWeight={600}
                noWrap
                sx={{ lineHeight: 1.3 }}
              >
                {track.title}
              </Typography>
              {track.artist && (
                <Typography variant="caption" color="text.secondary" noWrap>
                  {track.artist}
                </Typography>
              )}
            </Stack>

            {/* 控制按钮 */}
            <Stack direction="row" spacing={0.5}>
              <IconButton
                size="small"
                component={Link}
                href={`/songs/${track.id}`}
                title="查看详情"
              >
                <OpenInNew fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={toggleMinimize} title="收起">
                <ExpandMore fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={stop} title="关闭">
                <Close fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>

          {/* 歌词显示区域 */}
          <Divider />
          <LyricsDisplay
            prevLine={prevLine}
            currentLine={currentLine}
            nextLine={nextLine}
            isPreview={isPreview}
          />
          <Divider />

          {/* 进度条和时间 */}
          <Box sx={{ px: 1.5, pb: 0.5 }}>
            <Slider
              value={currentTime}
              max={duration || 100}
              onChange={(_, value) => seek(value as number)}
              size="small"
              disabled={isLoading || duration === 0}
              sx={{
                py: 0.5,
                "& .MuiSlider-thumb": {
                  width: 12,
                  height: 12,
                  transition: "0.2s",
                  "&:hover, &.Mui-focusVisible": {
                    boxShadow: "0 0 0 6px rgba(45, 107, 95, 0.16)",
                  },
                },
                "& .MuiSlider-rail": {
                  opacity: 0.3,
                },
              }}
            />
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">
                {formatTime(currentTime)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatTime(duration)}
              </Typography>
            </Stack>
          </Box>

          {/* 播放控制 */}
          <Stack
            direction="row"
            justifyContent="center"
            alignItems="center"
            spacing={1}
            sx={{ pb: 1.5 }}
          >
            <IconButton
              onClick={isPlaying ? pause : resume}
              disabled={isLoading}
              color="primary"
              sx={{
                bgcolor: "primary.main",
                color: "white",
                width: 44,
                height: 44,
                "&:hover": { bgcolor: "primary.dark" },
                "&.Mui-disabled": { bgcolor: "grey.300", color: "grey.500" },
              }}
            >
              {isLoading ? (
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    border: "2px solid",
                    borderColor: "inherit",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    "@keyframes spin": {
                      "0%": { transform: "rotate(0deg)" },
                      "100%": { transform: "rotate(360deg)" },
                    },
                  }}
                />
              ) : isPlaying ? (
                <Pause />
              ) : (
                <PlayArrow />
              )}
            </IconButton>
          </Stack>
        </Stack>
      )}
    </Paper>
  );
}
