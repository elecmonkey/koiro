import { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  CircularProgress,
  Container,
  Pagination,
  Stack,
  Typography,
} from '@mui/material';
import { Link } from 'react-router';
import type { Page, Playlist } from '@koiro/shared';
import { api, withQuery } from '@/lib/api';
import { pageTitle } from '@/utils/page-title';

function PlaylistsClient() {
  const [pagination, setPagination] = useState<Page<Playlist> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const playlists = pagination?.items ?? [];
  const [page, setPage] = useState(1);

  const fetchPlaylists = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      setPagination(
        await api<Page<Playlist>>(withQuery('/api/playlists', { page: p })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPlaylists(page);
  }, [fetchPlaylists, page]);

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
          <Typography variant="h4">播放列表</Typography>
        </Stack>
      </Container>

      <Container sx={{ pt: 4 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : playlists.length === 0 ? (
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              py: 8,
              textAlign: 'center',
            }}
          >
            暂无播放列表
          </Typography>
        ) : (
          <Stack spacing={3}>
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
              {playlists.map((playlist) => (
                <Card
                  key={playlist.id}
                  variant="outlined"
                  sx={{
                    height: '100%',
                    transition: 'border-color 0.2s',
                    '&:hover': {
                      borderColor: 'primary.main',
                    },
                  }}
                >
                  <CardActionArea
                    component={Link}
                    to={`/playlists/${playlist.id}`}
                    sx={{ height: '100%' }}
                  >
                    <CardMedia
                      component="img"
                      image={playlist.coverUrl}
                      alt={playlist.name}
                      sx={{ aspectRatio: '1', objectFit: 'cover' }}
                    />
                    <CardContent sx={{ p: 1.5 }}>
                      <Typography
                        variant="subtitle2"
                        noWrap
                        title={playlist.name}
                      >
                        {playlist.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                        }}
                      >
                        {playlist.songCount} 首歌曲
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
            </Box>

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
      <title>{pageTitle('播放列表')}</title>
      <PlaylistsClient />
    </>
  );
}
