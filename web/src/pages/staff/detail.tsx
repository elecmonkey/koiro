import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Container,
  Pagination,
  Stack,
  Typography,
} from '@mui/material';
import SongCard from '@/components/song/song-card';
import type { Page, SongSummary, StaffMember } from '@koiro/shared';
import { api, withQuery } from '@/lib/api';
import { useParams } from 'react-router';
import { pageTitle } from '@/utils/page-title';

function StaffDetailClient({ name }: { name: string }) {
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Page<SongSummary> | null>(null);
  const songs = pagination?.items ?? [];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const staffName = useMemo(() => decodeURIComponent(name), [name]);

  useEffect(() => {
    let active = true;
    const fetchStaff = async () => {
      setLoading(true);
      setError(null);
      try {
        const [member, songPage] = await Promise.all([
          api<StaffMember>(`/api/staff/${encodeURIComponent(staffName)}`),
          api<Page<SongSummary>>(
            withQuery('/api/songs', { staff: staffName, page }),
          ),
        ]);
        if (!active) return;
        setStaff(member);
        setPagination(songPage);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchStaff();
    return () => {
      active = false;
    };
  }, [staffName, page]);

  const topRoles = staff?.roles.slice(0, 3) ?? [];

  return (
    <Box component="main" sx={{ pb: 8 }}>
      <Container sx={{ pt: 6 }}>
        <Stack spacing={1.5}>
          <Typography variant="h4">{staffName}</Typography>
          {staff && (
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                }}
              >
                共参与 {staff.songCount} 首
              </Typography>
              {topRoles.map((role) => (
                <Chip
                  key={role.role}
                  size="small"
                  label={role.role}
                  variant="outlined"
                />
              ))}
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

export default function Page() {
  const { name = '' } = useParams();
  return (
    <>
      <title>{pageTitle(name)}</title>
      <StaffDetailClient key={name} name={name} />
    </>
  );
}
