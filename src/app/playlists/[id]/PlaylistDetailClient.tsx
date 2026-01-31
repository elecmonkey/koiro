"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Alert,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Pagination,
  Stack,
  Typography,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import Link from "next/link";
import { usePlayer, type Track } from "@/app/player";
import type { LyricsDocument } from "@/app/editor/ast/types";

type Song = {
  id: string;
  title: string;
  description: string | null;
  staff: { role: string; name: string | string[] }[];
  coverUrl: string | null;
  audioVersions: Record<string, string> | null;
  order: number;
  lyrics: LyricsDocument | null;
};

type PlaylistInfo = {
  id: string;
  name: string;
  description: string;
  coverUrl: string | null;
  songCount: number;
  updatedAt: string;
};

type PaginationInfo = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type Props = {
  playlistId: string;
};

export default function PlaylistDetailClient({ playlistId }: Props) {
  const { play, pause, resume, track: currentTrack, isPlaying, isLoading } = usePlayer();
  const [playlist, setPlaylist] = useState<PlaylistInfo | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(1);

  const fetchPlaylist = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/playlists/public/${playlistId}?page=${p}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("播放列表不存在");
        }
        throw new Error("获取播放列表失败");
      }
      const data = await res.json();
      setPlaylist(data.playlist);
      setSongs(data.songs);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setLoading(false);
    }
  }, [playlistId]);

  useEffect(() => {
    fetchPlaylist(page);
  }, [fetchPlaylist, page]);

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading && !playlist) {
    return (
      <Box component="main" sx={{ pb: 8 }}>
        <Container sx={{ pt: 6 }}>
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        </Container>
      </Box>
    );
  }

  if (error) {
    return (
      <Box component="main" sx={{ pb: 8 }}>
        <Container sx={{ pt: 6 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      </Box>
    );
  }

  if (!playlist) {
    return null;
  }

  return (
    <Box component="main" sx={{ pb: 8 }}>
      {/* 播放列表信息头部 */}
      <Container sx={{ pt: 6 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems={{ sm: "flex-end" }}>
          {playlist.coverUrl ? (
            <Box
              component="img"
              src={playlist.coverUrl}
              alt={playlist.name}
              sx={{
                width: { xs: 160, sm: 200 },
                height: { xs: 160, sm: 200 },
                objectFit: "cover",
                borderRadius: 1,
                boxShadow: 2,
              }}
            />
          ) : (
            <Box
              sx={{
                width: { xs: 160, sm: 200 },
                height: { xs: 160, sm: 200 },
                bgcolor: "action.hover",
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography variant="h2" color="text.disabled">
                ♪
              </Typography>
            </Box>
          )}
          <Stack spacing={1} sx={{ pb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              播放列表
            </Typography>
            <Typography variant="h4">{playlist.name}</Typography>
            {playlist.description && (
              <Typography variant="body2" color="text.secondary">
                {playlist.description}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              {playlist.songCount} 首歌曲
            </Typography>
          </Stack>
        </Stack>
      </Container>

      {/* 歌曲列表 */}
      <Container sx={{ pt: 4 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : songs.length === 0 ? (
          <Typography variant="body1" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
            暂无歌曲
          </Typography>
        ) : (
          <Stack spacing={2}>
            {songs.map((song, index) => {
              // 获取默认音频版本
              const audioVersions = song.audioVersions ?? {};
              const versionNames = Object.keys(audioVersions);
              const defaultAudioObjectId = versionNames.length > 0 ? audioVersions[versionNames[0]] : null;
              const artist = (song.staff ?? []).map((s) => s.name).join("、");

              const track: Track | null = defaultAudioObjectId
                ? {
                    id: song.id,
                    title: song.title,
                    artist,
                    coverUrl: song.coverUrl,
                    audioObjectId: defaultAudioObjectId,
                    lyrics: song.lyrics,
                  }
                : null;

              const isCurrentSong = currentTrack?.id === song.id;

              const handlePlayClick = (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                if (!track) return;
                if (isCurrentSong) {
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
                  key={song.id}
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
                      <Stack direction="row" spacing={2} alignItems={{ xs: "flex-start", sm: "center" }} sx={{ width: "100%", pr: track ? 6 : 0 }}>
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
                  {track && (
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={handlePlayClick}
                      disabled={isLoading && isCurrentSong}
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
                      {isCurrentSong && isPlaying ? (
                        <PauseIcon fontSize="small" />
                      ) : (
                        <PlayArrowIcon fontSize="small" />
                      )}
                    </IconButton>
                  )}
                </Card>
              );
            })}

            {pagination && pagination.totalPages > 1 && (
              <Box sx={{ display: "flex", justifyContent: "center", pt: 2 }}>
                <Pagination
                  count={pagination.totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                />
              </Box>
            )}
          </Stack>
        )}
      </Container>
    </Box>
  );
}
