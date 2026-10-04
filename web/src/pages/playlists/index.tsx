import { useState } from 'react';
import { Box, Container } from '@mui/material';
import { PlaylistCard } from '@/components/playlist/playlist-card';
import { ListPagination } from '@/components/ui/list-pagination';
import { PageHeader } from '@/components/ui/page-header';
import { PageState } from '@/components/ui/page-state';
import { usePlaylists } from '@/query';
import { pageTitle } from '@/utils/page-title';

export default function PlaylistsPage() {
  const [page, setPage] = useState(1);
  const { data, isPending, error } = usePlaylists({ page });

  return (
    <Box component="main" sx={{ pb: 8 }}>
      <title>{pageTitle('播放列表')}</title>
      <PageHeader title="播放列表" />
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
    </Box>
  );
}
