import type { Playlist } from '@koiro/shared';
import { Box, Button, Divider, Stack, Typography } from '@mui/material';
import { Link } from 'react-router';
import { formatDate } from '@/utils/format-date';

/** 管理列表里的一个歌单：名称、简介，以及编辑 / 管理歌曲 / 删除的入口 */
export function PlaylistRow({
  playlist,
  onEdit,
  onDelete,
}: {
  playlist: Playlist;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1">{playlist.name}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {playlist.songCount} 首 · 更新于 {formatDate(playlist.updatedAt)}
          </Typography>
          {playlist.description && (
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', mt: 0.5 }}
            >
              {playlist.description}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Button size="small" variant="outlined" onClick={onEdit}>
            编辑
          </Button>
          <Button
            component={Link}
            to={`/mine/playlists/${playlist.id}`}
            size="small"
            variant="text"
          >
            管理
          </Button>
          <Button size="small" color="error" onClick={onDelete}>
            删除
          </Button>
        </Stack>
      </Stack>
      <Divider sx={{ my: 2 }} />
    </Box>
  );
}
