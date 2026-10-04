import { useState } from 'react';
import { useParams } from 'react-router';
import { Alert, Box, Container, Stack, Typography } from '@mui/material';
import { isLanguage, languageName } from '@koiro/shared';
import { SongList } from '@/components/song/song-list';
import { ListPagination } from '@/components/ui/list-pagination';
import { PageHeader } from '@/components/ui/page-header';
import { PageState } from '@/components/ui/page-state';
import { useSongs } from '@/query';
import { pageTitle } from '@/utils/page-title';

export default function LanguageDetailPage() {
  const { language = '' } = useParams();
  const [page, setPage] = useState(1);
  const valid = isLanguage(language);
  const songs = useSongs(
    { language: valid ? language : undefined, page },
    { enabled: valid },
  );

  return (
    <Box component="main" sx={{ pb: 8 }}>
      <title>{pageTitle(languageName(language))}</title>
      <PageHeader title={languageName(language)}>
        {songs.data && (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              共 {songs.data.total} 首
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              ({language})
            </Typography>
          </Stack>
        )}
      </PageHeader>
      <Container sx={{ pt: 4 }}>
        {valid ? (
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
        ) : (
          <Alert severity="error">没有这个语种</Alert>
        )}
      </Container>
    </Box>
  );
}
