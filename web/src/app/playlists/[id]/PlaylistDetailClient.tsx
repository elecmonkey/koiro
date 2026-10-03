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
import SongCard from '@/app/components/SongCard';
import { pageTitle } from '@/lib/site-config';
import { api, type Cover, type SongSummary } from '@/lib/api';

type Song = SongSummary;

type PlaylistInfo = {
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

type Props = {
  playlistId: string;
};

export default function PlaylistDetailClient({ playlistId }: Props) {
  const [playlist, setPlaylist] = useState<PlaylistInfo | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(1);

  const fetchPlaylist = useCallback(
    async (p: number) => {
      setLoading(true);
      setError(null);
      try {
        const data = await api<{
          playlist: PlaylistInfo;
          songs: Song[];
          pagination: PaginationInfo;
        }>(`/api/playlists/${playlistId}?page=${p}`);
        setPlaylist(data.playlist);
        setSongs(data.songs);
        setPagination(data.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoading(false);
      }
    },
    [playlistId],
  );

  useEffect(() => {
    void fetchPlaylist(page);
  }, [fetchPlaylist, page]);

  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    value: number,
  ) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading && !playlist) {
    return (
      <Box component="main" sx={{ pb: 8 }}>
        <title>{pageTitle('播放列表')}</title>
        <Container sx={{ pt: 6 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        </Container>
      </Box>
    );
  }

  if (error) {
    return (
      <Box component="main" sx={{ pb: 8 }}>
        <Container sx={{ pt: 6 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      </Box>
    );
  }

  if (!playlist) {
    return null;
  }

  return (
    <Box component="main" sx={{ pb: 8 }}>
      <title>{pageTitle(playlist.name)}</title>
      {/* 播放列表信息头部 */}
      <Container sx={{ pt: 6 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={3}
          sx={{
            alignItems: { sm: 'flex-end' },
          }}
        >
          {playlist.cover?.url ? (
            <Box
              component="img"
              src={playlist.cover?.url}
              alt={playlist.name}
              sx={{
                width: { xs: 160, sm: 200 },
                height: { xs: 160, sm: 200 },
                objectFit: 'cover',
                borderRadius: 1,
                boxShadow: 2,
              }}
            />
          ) : (
            <Box
              sx={{
                width: { xs: 160, sm: 200 },
                height: { xs: 160, sm: 200 },
                bgcolor: 'action.hover',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography
                variant="h2"
                sx={{
                  color: 'text.disabled',
                }}
              >
                ♪
              </Typography>
            </Box>
          )}
          <Stack spacing={1} sx={{ pb: 1 }}>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
              }}
            >
              播放列表
            </Typography>
            <Typography variant="h4">{playlist.name}</Typography>
            {playlist.description && (
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                }}
              >
                {playlist.description}
              </Typography>
            )}
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
              }}
            >
              {playlist.songCount} 首歌曲
            </Typography>
          </Stack>
        </Stack>
      </Container>

      {/* 歌曲列表 */}
      <Container sx={{ pt: 4 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : songs.length === 0 ? (
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              py: 4,
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
