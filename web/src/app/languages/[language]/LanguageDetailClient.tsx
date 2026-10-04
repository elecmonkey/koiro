import { useEffect, useMemo, useState } from 'react';
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
import {
  isLanguage,
  languageName as nameOf,
  type Page,
  type SongSummary,
} from '@koiro/shared';
import { api, withQuery } from '@/lib/api';

export default function LanguageDetailClient({
  language,
}: {
  language: string;
}) {
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Page<SongSummary> | null>(null);
  const songs = pagination?.items ?? [];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const languageCode = useMemo(() => decodeURIComponent(language), [language]);
  const languageName = useMemo(() => nameOf(languageCode), [languageCode]);

  useEffect(() => {
    let active = true;
    const fetchLanguage = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!isLanguage(languageCode)) throw new Error('没有这个语种');
        const data = await api<Page<SongSummary>>(
          withQuery('/api/songs', { language: languageCode, page }),
        );
        if (active) setPagination(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchLanguage();
    return () => {
      active = false;
    };
  }, [languageCode, page]);

  return (
    <Box component="main" sx={{ pb: 8 }}>
      <Container sx={{ pt: 6 }}>
        <Stack spacing={1.5}>
          <Typography variant="h4">{languageName}</Typography>
          {pagination && (
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: 'center',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                }}
              >
                共 {pagination.total} 首
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                }}
              >
                ({languageCode})
              </Typography>
            </Stack>
          )}
        </Stack>
      </Container>

      <Container sx={{ pt: 4 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
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
                  onChange={(_event, value) => setPage(value)}
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
