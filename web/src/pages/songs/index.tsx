import { useState } from 'react';
import { hasPermission } from '@koiro/shared';
import { Box, Button, Container } from '@mui/material';
import { Link } from 'react-router';
import { SongList } from '@/components/song/song-list';
import { ListPagination } from '@/components/ui/list-pagination';
import { PageHeader } from '@/components/ui/page-header';
import { PageState } from '@/components/ui/page-state';
import { useCurrentUser, useSongs } from '@/query';
import { pageTitle } from '@/utils/page-title';

export default function SongsPage() {
  const [page, setPage] = useState(1);
  const user = useCurrentUser();
  const { data, isPending, error } = useSongs({ page });

  return (
    <Box component="main" sx={{ pb: 8 }}>
      <title>{pageTitle('歌曲列表')}</title>
      <PageHeader
        title="全部歌曲"
        subtitle={data && `共 ${String(data.total)} 首歌曲`}
        action={
          user !== null &&
          hasPermission(user, 'upload') && (
            <Button
              component={Link}
              to="/upload"
              variant="contained"
              size="small"
            >
              上传
            </Button>
          )
        }
      />
      <Container sx={{ pt: 4 }}>
        <PageState
          loading={isPending}
          error={error}
          empty={data?.total === 0 && '暂无歌曲'}
        >
          {data && <SongList songs={data.items} />}
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
