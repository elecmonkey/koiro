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
import { api, type Cover } from '@/lib/api';

type Playlist = {
  id: string;
  name: string;
  description: string;
  cover: Cover | null;
  songCount: number;
  updatedAt: string;
};

type PaginationInfo = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export default function PlaylistsClient() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(1);

  const fetchPlaylists = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<{
        playlists: Playlist[];
        pagination: PaginationInfo;
      }>(`/api/playlists?page=${p}`);
      setPlaylists(data.playlists);
      setPagination(data.pagination);
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
                    {playlist.cover?.url ? (
                      <CardMedia
                        component="img"
                        image={playlist.cover?.url}
                        alt={playlist.name}
                        sx={{ aspectRatio: '1', objectFit: 'cover' }}
                      />
                    ) : (
                      <Box
                        sx={{
                          aspectRatio: '1',
                          bgcolor: 'action.hover',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography
                          variant="h4"
                          sx={{
                            color: 'text.disabled',
                          }}
                        >
                          ♪
                        </Typography>
                      </Box>
                    )}
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
