"use client";

import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import Link from "next/link";
import { usePlayer, type Track } from "@/app/player";
import type { LyricsDocument } from "@/app/editor/ast/types";

export type SongCardData = {
  id: string;
  title: string;
  description?: string | null;
  staff: { role: string; name: string | string[] }[];
  coverUrl: string | null;
  audioVersions?: Record<string, string | { objectId: string; lyricsId?: string | null }> | null;
  lyrics?: LyricsDocument | null;
};

type SongCardProps = {
  song: SongCardData;
  showPlayButton?: boolean;
};

export default function SongCard({ song, showPlayButton = true }: SongCardProps) {
  const { play, pause, resume, track: currentTrack, isPlaying, isLoading } = usePlayer();

  // 获取默认音频版本
  const audioVersions = song.audioVersions ?? {};
  const versionNames = Object.keys(audioVersions);
  const defaultVersionKey = versionNames[0];
  const defaultVersionValue = versionNames.length > 0 ? audioVersions[defaultVersionKey] : null;
  // 兼容旧格式（字符串）和新格式（对象）
  const defaultAudioObjectId = defaultVersionValue 
    ? (typeof defaultVersionValue === 'string' ? defaultVersionValue : defaultVersionValue.objectId)
    : null;
  // 只有当音频版本明确绑定了歌词时才传递歌词（新格式且有lyricsId）
  const hasLyricsBinding = defaultVersionValue && typeof defaultVersionValue !== 'string' && defaultVersionValue.lyricsId;
  const artist = (song.staff ?? []).map((s) => (Array.isArray(s.name) ? s.name.join("、") : s.name)).join("、");

  const track: Track | null = defaultAudioObjectId
    ? {
        id: song.id,
        title: song.title,
        artist,
        coverUrl: song.coverUrl,
        audioObjectId: defaultAudioObjectId,
        versionKey: defaultVersionKey,
        lyrics: hasLyricsBinding ? song.lyrics : null,
        languages: hasLyricsBinding && song.lyrics?.meta?.languages ? song.lyrics.meta.languages : undefined,
      }
    : null;

  // 通过歌曲 ID 和 audioObjectId 同时匹配，确保是同一个版本
  const isCurrentTrack = 
    track && currentTrack?.id === song.id && 
    currentTrack?.audioObjectId === track.audioObjectId;

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!track) return;
    if (isCurrentTrack) {
      if (isPlaying) {
        pause();
      } else {
        resume();
      }
    } else {
      play(track);
    }
  };

  return (
    <Card
      variant="outlined"
      sx={{
        position: "relative",
        transition: "border-color 0.2s",
        overflow: "hidden",
        "&:hover": {
          borderColor: "primary.main",
        },
      }}
    >
      {/* 移动端背景封面 */}
      {song.coverUrl && (
        <Box
          sx={{
            display: { xs: "block", sm: "none" },
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "45%",
            background: `url(${song.coverUrl}) center/cover no-repeat`,
            "&::after": {
              content: '""',
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: "60%",
              background: (theme) => `linear-gradient(to right, transparent, ${theme.palette.background.paper})`,
            },
          }}
        />
      )}

      <CardActionArea
        component={Link}
        href={`/songs/${song.id}`}
        sx={{ height: { xs: "auto", sm: 72 } }}
      >
        <CardContent
          sx={{
            py: { xs: 2, sm: 0 },
            pl: { xs: 2, sm: 0 },
            height: "100%",
            display: "flex",
            alignItems: "center",
            position: "relative",
          }}
        >
          <Stack direction="row" spacing={2} alignItems={{ xs: "flex-start", sm: "center" }} sx={{ width: "100%", pr: showPlayButton && track ? 6 : 0 }}>
            {/* 封面 - 仅桌面端显示 */}
            <Box
              sx={{
                display: { xs: "none", sm: "flex" },
                width: 72,
                height: 72,
                flexShrink: 0,
                background: song.coverUrl
                  ? `url(${song.coverUrl}) center/cover no-repeat`
                  : "linear-gradient(135deg, #f3efe7, #e8dfd1)",
                alignItems: "center",
                justifyContent: "center",
                color: "text.disabled",
                fontSize: 24,
              }}
            >
              {!song.coverUrl && "♪"}
            </Box>

            {/* 歌曲信息 */}
            <Box sx={{ flex: 1, minWidth: 0, pl: { xs: "30%", sm: 0 } }}>
              <Typography variant="subtitle1" noWrap color="text.primary">
                {song.title}
              </Typography>
              {song.staff && song.staff.length > 0 && (
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{ mt: 0.5 }}
                  flexWrap="wrap"
                  useFlexGap
                >
                  {song.staff.slice(0, 3).map((s, idx) => (
                    <Chip
                      key={idx}
                      label={`${s.role || "Staff"} · ${Array.isArray(s.name) ? s.name.join("、") : (s.name || "")}`}
                      size="small"
                      variant="outlined"
                      sx={{
                        bgcolor: { xs: "rgba(255,255,255,0.8)", sm: "transparent" },
                        backdropFilter: { xs: "blur(4px)", sm: "none" },
                      }}
                    />
                  ))}
                  {song.staff.length > 3 && (
                    <Chip
                      label={`+${song.staff.length - 3}`}
                      size="small"
                      variant="outlined"
                      sx={{
                        bgcolor: { xs: "rgba(255,255,255,0.8)", sm: "transparent" },
                        backdropFilter: { xs: "blur(4px)", sm: "none" },
                      }}
                    />
                  )}
                </Stack>
              )}
            </Box>
          </Stack>
        </CardContent>
      </CardActionArea>

      {/* 播放按钮 - 放在 CardActionArea 外部避免 button 嵌套 */}
      {showPlayButton && track && (
        <IconButton
          size="small"
          color="primary"
          onClick={handlePlayClick}
          disabled={isLoading && !!isCurrentTrack}
          sx={{
            position: "absolute",
            right: 16,
            top: "50%",
            transform: "translateY(-50%)",
            bgcolor: "primary.main",
            color: "primary.contrastText",
            width: 36,
            height: 36,
            "&:hover": { bgcolor: "primary.dark" },
          }}
        >
          {isCurrentTrack && isPlaying ? (
            <PauseIcon fontSize="small" />
          ) : (
            <PlayArrowIcon fontSize="small" />
          )}
        </IconButton>
      )}
    </Card>
  );
}
