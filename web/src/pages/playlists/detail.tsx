import { useState } from 'react';
import { useParams } from 'react-router';
import { hasPermission } from '@koiro/shared';
import { Box, Container } from '@mui/material';
import { PlaylistHeader } from '@/components/playlist/playlist-header';
import { SongList } from '@/components/song/song-list';
import { ListPagination } from '@/components/ui/list-pagination';
import { OwnerFooter } from '@/components/ui/owner-footer';
import { PageState } from '@/components/ui/page-state';
import { useCurrentUser, usePlaylist, useSongs } from '@/query';
import { pageTitle } from '@/utils/page-title';

export default function PlaylistDetailPage() {
  const { id = '' } = useParams();
  const [page, setPage] = useState(1);
  const user = useCurrentUser();
  const playlist = usePlaylist(id);
  const songs = useSongs({ playlist: id, page });
  const owner = playlist.data?.owner;
  const canEdit =
    user !== null &&
    !!owner &&
    (hasPermission(user, 'admin') || user.id === owner.id);

  return (
    <Box component="main" sx={{ pb: 8 }}>
      <title>{pageTitle(playlist.data?.name ?? '播放列表')}</title>
      <Container sx={{ pt: 6 }}>
        <PageState loading={playlist.isPending} error={playlist.error}>
          {playlist.data && <PlaylistHeader playlist={playlist.data} />}
        </PageState>
      </Container>
      {playlist.data && (
        <Container sx={{ pt: 4 }}>
          <PageState
            loading={songs.isPending}
            error={songs.error}
            empty={songs.data?.total === 0 && '暂无歌曲'}
          >
            {songs.data && <SongList songs={songs.data.items} />}
            <ListPagination
              page={page}
              totalPages={songs.data?.totalPages ?? 0}
              onChange={setPage}
            />
          </PageState>
        </Container>
      )}
      {playlist.data && (
        <Container sx={{ pt: 4 }}>
          <OwnerFooter
            owner={playlist.data.owner}
            label="创建者"
            canEdit={canEdit}
            editHref={`/mine/playlists/${playlist.data.id}`}
          />
        </Container>
      )}
    </Box>
  );
}
