import type { Playlist } from '@koiro/shared';
import { Box, Stack, Typography } from '@mui/material';
import { OwnerLine } from '@/components/ui/owner-line';

/** 歌单详情顶部：封面、名称、简介与歌曲数 */
export function PlaylistHeader({ playlist }: { playlist: Playlist }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={3}
      sx={{
        alignItems: { sm: 'flex-end' },
      }}
    >
      <Box
        component="img"
        src={playlist.coverUrl}
        alt={playlist.name}
        sx={{
          width: { xs: 160, sm: 200 },
          height: { xs: 160, sm: 200 },
          objectFit: 'cover',
          borderRadius: 1,
          boxShadow: 2,
        }}
      />
      <Stack spacing={1} sx={{ pb: 1 }}>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
          }}
        >
          播放列表
        </Typography>
        <Typography variant="h4">{playlist.name}</Typography>
        {playlist.description && (
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
            }}
          >
            {playlist.description}
          </Typography>
        )}
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
          }}
        >
          {playlist.songCount} 首歌曲
        </Typography>
        <OwnerLine owner={playlist.owner} label="创建者" />
      </Stack>
    </Stack>
  );
}
