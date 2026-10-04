import { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Pagination,
  Stack,
  Typography,
} from '@mui/material';
import SongCard from '@/components/song/song-card';
import type { Page, SongSummary } from '@koiro/shared';
import { api, withQuery } from '@/lib/api';
import { pageTitle } from '@/utils/page-title';

function SongsClient() {
  const [pagination, setPagination] = useState<Page<SongSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const songs = pagination?.items ?? [];
  const [page, setPage] = useState(1);

  const fetchSongs = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      setPagination(
        await api<Page<SongSummary>>(withQuery('/api/songs', { page: p })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSongs(page);
  }, [fetchSongs, page]);

  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    value: number,
  ) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Box component="main" sx={{ pb: 8 }}>
      <Container sx={{ pt: 6 }}>
        <Stack spacing={1}>
          <Typography variant="h4">全部歌曲</Typography>
          {pagination && (
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
              }}
            >
              共 {pagination.total} 首歌曲
            </Typography>
          )}
        </Stack>
      </Container>

      <Container sx={{ pt: 4 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : songs.length === 0 ? (
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              py: 8,
              textAlign: 'center',
            }}
          >
            暂无歌曲
          </Typography>
        ) : (
          <Stack spacing={2}>
            {songs.map((song) => (
              <SongCard key={song.id} song={song} />
            ))}

            {pagination && pagination.totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
                <Pagination
                  count={pagination.totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                />
              </Box>
            )}
          </Stack>
        )}
      </Container>
    </Box>
  );
}

export default function Page() {
  return (
    <>
      <title>{pageTitle('歌曲列表')}</title>
      <SongsClient />
    </>
  );
}
