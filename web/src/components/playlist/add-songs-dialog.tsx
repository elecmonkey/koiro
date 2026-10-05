import { useState } from 'react';
import type { PlaylistId, SongOption } from '@koiro/shared';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAddPlaylistSongs } from '@/query';

/** 把一首歌加入歌单；`options` 应已排除已在歌单里的歌曲 */
export function AddSongsDialog({
  playlistId,
  options,
  onClose,
  onAdded,
}: {
  playlistId: PlaylistId;
  options: readonly SongOption[];
  onClose: () => void;
  /** 添加成功后调用，用于在列表页提示 */
  onAdded: () => void;
}) {
  const [selected, setSelected] = useState<SongOption | null>(null);
  const addSongs = useAddPlaylistSongs(playlistId);

  const submit = () => {
    if (!selected) return;
    addSongs.mutate([selected.id], {
      onSuccess: () => {
        onAdded();
        onClose();
      },
    });
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>添加歌曲到播放列表</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Autocomplete
            options={options}
            getOptionLabel={(option) => option.title}
            value={selected}
            onChange={(_, value) => setSelected(value)}
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
          {addSongs.error && (
            <Alert severity="error">{addSongs.error.message}</Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={addSongs.isPending}>
          取消
        </Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={addSongs.isPending || !selected}
        >
          {addSongs.isPending ? '添加中...' : '添加'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
