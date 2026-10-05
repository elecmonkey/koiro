import { useState } from 'react';
import type { PlaylistId, SongOption } from '@koiro/shared';
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  IconButton,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { Link } from 'react-router';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { PageState } from '@/components/ui/page-state';
import { useAllSongs, useRemovePlaylistSong, useSongOptions } from '@/query';
import { AddSongsDialog } from './add-songs-dialog';

/** 一个歌单内的歌曲：增删歌曲，顺序调整留给用户直接拖拽歌单详情页（暂未支持） */
export function PlaylistSongsManager({
  playlistId,
}: {
  playlistId: PlaylistId;
}) {
  const songs = useAllSongs({ playlist: playlistId });
  const options = useSongOptions();
  const removeSong = useRemovePlaylistSong(playlistId);

  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<SongOption | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const existingIds = new Set((songs.data ?? []).map((song) => song.id));
  const addable = (options.data ?? []).filter(
    (song) => !existingIds.has(song.id),
  );

  return (
    <>
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
                歌曲列表 ({songs.data?.length ?? 0})
              </Typography>
              <Button
                variant="contained"
                onClick={() => setAddOpen(true)}
                disabled={addable.length === 0}
              >
                添加歌曲
              </Button>
            </Stack>

            <PageState
              loading={songs.isPending}
              error={songs.error}
              empty={songs.data?.length === 0 && '暂无歌曲，点击上方按钮添加'}
            >
              {songs.data?.map((song, index) => (
                <Box key={song.id}>
                  {index > 0 && <Divider sx={{ mb: 2 }} />}
                  <Stack
                    direction="row"
                    spacing={2}
                    sx={{ alignItems: 'center' }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1">{song.title}</Typography>
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
                        onClick={() => setRemoveTarget(song)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Box>
              ))}
            </PageState>
          </Stack>
        </CardContent>
      </Card>

      {addOpen && (
        <AddSongsDialog
          playlistId={playlistId}
          options={addable}
          onClose={() => setAddOpen(false)}
          onAdded={() => setMessage('已添加歌曲')}
        />
      )}

      <ConfirmDialog
        open={removeTarget !== null}
        title="移除歌曲"
        message={
          <Typography>
            确定要从播放列表移除「{removeTarget?.title}」吗？
          </Typography>
        }
        confirmLabel="移除"
        pending={removeSong.isPending}
        onConfirm={() => {
          if (!removeTarget) return;
          removeSong.mutate(removeTarget.id, {
            onSuccess: () => {
              setRemoveTarget(null);
              setMessage('已移除歌曲');
            },
          });
        }}
        onClose={() => setRemoveTarget(null)}
      />

      <Snackbar
        open={message !== null}
        autoHideDuration={2000}
        message={message}
        onClose={() => setMessage(null)}
      />
    </>
  );
}
