import { useState } from 'react';
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
} from '@mui/material';
import { Link } from 'react-router';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import type { Playlist, PlaylistSongs, SongOption } from '@koiro/shared';
import { api } from '@/lib/api';

type Props = {
  playlist: Playlist;
  /** 歌单里的歌曲，按歌单顺序 */
  initialSongs: SongOption[];
  /** 全部歌曲，供选择加入 */
  availableSongs: SongOption[];
};

export function PlaylistSongsClient({
  playlist,
  initialSongs,
  availableSongs,
}: Props) {
  const [songs, setSongs] = useState<SongOption[]>(initialSongs);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState<SongOption | null>(null);
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
      await api(`/api/playlists/${playlist.id}/songs`, {
        method: 'POST',
        json: { songIds: [selectedSong.id] } satisfies PlaylistSongs,
      });
      // 追加到末尾
      setSongs((prev) => [...prev, selectedSong]);
      setSelectedSong(null);
      setAddDialogOpen(false);
      setSuccess('已添加歌曲');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveSong = async (songId: string, songTitle: string) => {
    if (!confirm(`确定要从播放列表移除「${songTitle}」吗？`)) return;
    setSubmitting(true);
    setError(null);
    try {
      await api(`/api/playlists/${playlist.id}/songs/${songId}`, {
        method: 'DELETE',
      });
      setSongs((prev) => prev.filter((s) => s.id !== songId));
      setSuccess('已移除歌曲');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '移除失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box component="main" sx={{ pb: 8 }}>
      <Container sx={{ pt: 6 }}>
        <Stack spacing={2}>
          <Link to="/admin/playlists">
            <Button startIcon={<ArrowBackIcon />} size="small">
              返回管理后台
            </Button>
          </Link>
          <Typography variant="h4">管理播放列表</Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
            }}
          >
            {playlist.name}
          </Typography>
        </Stack>
      </Container>

      <Container sx={{ pt: 4 }}>
        <Stack spacing={3}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={2}
                  sx={{
                    alignItems: { md: 'center' },
                    justifyContent: 'space-between',
                  }}
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
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      py: 4,
                      textAlign: 'center',
                    }}
                  >
                    暂无歌曲，点击上方按钮添加
                  </Typography>
                ) : (
                  songs.map((song, index) => (
                    <Box key={song.id}>
                      {index > 0 && <Divider sx={{ mb: 2 }} />}
                      <Stack
                        direction="row"
                        spacing={2}
                        sx={{
                          alignItems: 'center',
                        }}
                      >
                        <Box
                          sx={{
                            flex: 1,
                          }}
                        >
                          <Typography variant="subtitle1">
                            {song.title}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <Button
                            component={Link}
                            to={`/songs/${song.id}`}
                            size="small"
                            variant="text"
                          >
                            查看
                          </Button>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() =>
                              void handleRemoveSong(song.id, song.title)
                            }
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
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>添加歌曲到播放列表</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Autocomplete
              options={addableSongs}
              getOptionLabel={(option) => option.title}
              value={selectedSong}
              onChange={(_, value) => setSelectedSong(value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="搜索歌曲"
                  placeholder="输入歌曲名"
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option.id}>
                  <Typography variant="body1">{option.title}</Typography>
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
            {submitting ? '添加中...' : '添加'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
