import { useState } from 'react';
import { hasPermission } from '@koiro/shared';
import { Box, Button, Container } from '@mui/material';
import { CreatePlaylistDialog } from '@/components/playlist/create-playlist-dialog';
import { PlaylistCard } from '@/components/playlist/playlist-card';
import { ListPagination } from '@/components/ui/list-pagination';
import { PageHeader } from '@/components/ui/page-header';
import { PageState } from '@/components/ui/page-state';
import { useCurrentUser, usePlaylists } from '@/query';
import { pageTitle } from '@/utils/page-title';

export default function PlaylistsPage() {
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const user = useCurrentUser();
  const { data, isPending, error } = usePlaylists({ page });

  return (
    <Box component="main" sx={{ pb: 8 }}>
      <title>{pageTitle('播放列表')}</title>
      <PageHeader
        title="播放列表"
        action={
          user !== null &&
          hasPermission(user, 'upload') && (
            <Button
              variant="contained"
              size="small"
              onClick={() => setCreateOpen(true)}
            >
              新建
            </Button>
          )
        }
      />
      <Container sx={{ pt: 4 }}>
        <PageState
          loading={isPending}
          error={error}
          empty={data?.total === 0 && '暂无播放列表'}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                sm: 'repeat(3, 1fr)',
                md: 'repeat(4, 1fr)',
                lg: 'repeat(5, 1fr)',
              },
              gap: 2,
            }}
          >
            {data?.items.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                showSongCount
              />
            ))}
          </Box>
          <ListPagination
            page={page}
            totalPages={data?.totalPages ?? 0}
            onChange={setPage}
          />
        </PageState>
      </Container>
      {createOpen && (
        <CreatePlaylistDialog onClose={() => setCreateOpen(false)} />
      )}
    </Box>
  );
}
