"use client";

import { useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

type PlaylistSong = {
  id: string;
  title: string;
  description: string | null;
  coverObjectId: string | null;
  order: number | null;
};

type AvailableSong = {
  id: string;
  title: string;
  description: string | null;
};

type PlaylistData = {
  id: string;
  name: string;
  songs: PlaylistSong[];
};

type Props = {
  playlist: PlaylistData;
  availableSongs: AvailableSong[];
};

export default function PlaylistSongsClient({ playlist, availableSongs }: Props) {
  const [songs, setSongs] = useState<PlaylistSong[]>(playlist.songs);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState<AvailableSong | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 已在播放列表中的歌曲 ID
  const existingSongIds = new Set(songs.map((s) => s.id));

  // 可添加的歌曲（排除已存在的）
  const addableSongs = availableSongs.filter((s) => !existingSongIds.has(s.id));

  const handleAddSong = async () => {
    if (!selectedSong) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/playlists/${playlist.id}/songs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songIds: [selectedSong.id] }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "添加失败");
      }
      // 更新本地状态
      setSongs((prev) => [
        ...prev,
        {
          id: selectedSong.id,
          title: selectedSong.title,
          description: selectedSong.description,
          coverObjectId: null,
          order: prev.length,
        },
      ]);
      setSelectedSong(null);
      setAddDialogOpen(false);
      setSuccess("已添加歌曲");
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "添加失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveSong = async (songId: string, songTitle: string) => {
    if (!confirm(`确定要从播放列表移除「${songTitle}」吗？`)) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/playlists/${playlist.id}/songs`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "移除失败");
      }
      setSongs((prev) => prev.filter((s) => s.id !== songId));
      setSuccess("已移除歌曲");
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "移除失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box component="main" sx={{ pb: 8 }}>
      <Container sx={{ pt: 6 }}>
        <Stack spacing={2}>
          <Link href="/admin">
            <Button startIcon={<ArrowBackIcon />} size="small">
              返回管理后台
            </Button>
          </Link>
          <Typography variant="h4">管理播放列表</Typography>
          <Typography variant="body1" color="text.secondary">
            {playlist.name}
          </Typography>
        </Stack>
      </Container>

      <Container sx={{ pt: 4 }}>
        <Stack spacing={3}>
          {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
          {success && <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>}

          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={2}
                  alignItems={{ md: "center" }}
                  justifyContent="space-between"
                >
                  <Typography variant="h6">
                    歌曲列表 ({songs.length})
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => setAddDialogOpen(true)}
                    disabled={addableSongs.length === 0}
                  >
                    添加歌曲
                  </Button>
                </Stack>

                {songs.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                    暂无歌曲，点击上方按钮添加
                  </Typography>
                ) : (
                  songs.map((song, index) => (
                    <Box key={song.id}>
                      {index > 0 && <Divider sx={{ mb: 2 }} />}
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Box flex={1}>
                          <Typography variant="subtitle1">{song.title}</Typography>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {song.description || "无描述"}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <Link href={`/songs/${song.id}`}>
                            <Button size="small" variant="text">
                              查看
                            </Button>
                          </Link>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveSong(song.id, song.title)}
                            disabled={submitting}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </Box>
                  ))
                )}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Container>

      {/* 添加歌曲对话框 */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>添加歌曲到播放列表</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Autocomplete
              options={addableSongs}
              getOptionLabel={(option) => option.title}
              value={selectedSong}
              onChange={(_, value) => setSelectedSong(value)}
              renderInput={(params) => (
                <TextField {...params} label="搜索歌曲" placeholder="输入歌曲名" />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option.id}>
                  <Stack>
                    <Typography variant="body1">{option.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.description || "无描述"}
                    </Typography>
                  </Stack>
                </Box>
              )}
              noOptionsText="没有可添加的歌曲"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddDialogOpen(false)} disabled={submitting}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={handleAddSong}
            disabled={submitting || !selectedSong}
          >
            {submitting ? "添加中..." : "添加"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
