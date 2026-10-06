import { Link, Navigate, useParams } from 'react-router';
import { canManage } from '@koiro/shared';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { PlaylistSongsManager } from '@/components/playlist/playlist-songs-manager';
import { PageState } from '@/components/ui/page-state';
import { useCurrentUser, usePlaylist } from '@/query';
import { pageTitle } from '@/utils/page-title';

export default function MinePlaylistDetailPage() {
  const { id = '' } = useParams();
  const user = useCurrentUser();
  const { data: playlist, isPending, error } = usePlaylist(id);

  // 不是自己能管理的歌单：回到它的公开页面，那里可以正常浏览
  if (playlist && !canManage(user, playlist.owner?.id)) {
    return <Navigate to={`/playlists/${playlist.id}`} replace />;
  }

  return (
    <Box component="main" sx={{ pb: 8 }}>
      <title>
        {pageTitle(playlist ? `管理 ${playlist.name}` : '管理播放列表')}
      </title>
      <Container sx={{ pt: 6 }}>
        <Stack spacing={2}>
          <Link to="/mine/playlists">
            <Button startIcon={<ArrowBackIcon />} size="small">
              返回我的歌单
            </Button>
          </Link>
          <Typography variant="h4">管理播放列表</Typography>
          <PageState loading={isPending} error={error}>
            {playlist && (
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                {playlist.name}
              </Typography>
            )}
          </PageState>
        </Stack>
      </Container>

      {playlist && (
        <Container sx={{ pt: 4 }}>
          <PlaylistSongsManager playlistId={playlist.id} />
        </Container>
      )}
    </Box>
  );
}
