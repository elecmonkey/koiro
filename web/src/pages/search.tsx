import { useSearchParams } from 'react-router';
import { Box, Card, Chip, Container, Stack, Typography } from '@mui/material';
import { SearchResultCard } from '@/components/song/search-result-card';
import { SearchForm } from '@/components/song/search-form';
import { ListPagination } from '@/components/ui/list-pagination';
import { PageState } from '@/components/ui/page-state';
import { useSearch } from '@/query';
import { pageTitle } from '@/utils/page-title';

/** 关键字与页码都在 URL 里，前进后退、分享链接都能还原 */
export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const page = Math.max(Number(params.get('page')) || 1, 1);
  const { data, isPending, isFetching, error } = useSearch({ q, page });

  return (
    <Box component="main" sx={{ pb: 8 }}>
      <title>{pageTitle('搜索')}</title>
      <Container sx={{ pt: 6 }}>
        <Stack spacing={3}>
          <Typography variant="h4">搜索</Typography>
          <SearchForm
            key={q}
            initial={q}
            searching={isFetching}
            onSearch={(next) => setParams(next ? { q: next } : {})}
          />
        </Stack>
      </Container>

      {q && (
        <Container sx={{ pt: 4 }}>
          <Card variant="outlined">
            <Box sx={{ p: 3 }}>
              <Stack spacing={3}>
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{ alignItems: 'center' }}
                >
                  <Typography variant="h6">搜索结果</Typography>
                  {data && (
                    <Chip
                      size="small"
                      label={`"${q}" · ${String(data.total)} 条结果`}
                      color="primary"
                      variant="outlined"
                    />
                  )}
                </Stack>
                <PageState
                  loading={isPending}
                  error={error}
                  empty={data?.total === 0 && '未找到匹配的结果'}
                >
                  <Stack spacing={2}>
                    {data?.items.map((hit) => (
                      <SearchResultCard key={hit.song.id} hit={hit} />
                    ))}
                  </Stack>
                  <ListPagination
                    page={page}
                    totalPages={data?.totalPages ?? 0}
                    onChange={(next) => setParams({ q, page: String(next) })}
                  />
                </PageState>
              </Stack>
            </Box>
          </Card>
        </Container>
      )}
    </Box>
  );
}
