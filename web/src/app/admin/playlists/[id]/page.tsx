import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Box, CircularProgress, Container, Typography } from '@mui/material';
import { api, ApiError } from '@/lib/api';
import { pageTitle } from '@/lib/site-config';
import PlaylistSongsClient from './PlaylistSongsClient';

type AdminPlaylistDetail = {
  playlist: { id: string; name: string };
  songs: {
    id: string;
    title: string;
    description: string;
    position: number | null;
  }[];
};

type SongOption = { id: string; title: string; description: string };

export default function PlaylistManagePage() {
  const { id = '' } = useParams();
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; detail: AdminPlaylistDetail; options: SongOption[] }
  >({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    Promise.all([
      api<AdminPlaylistDetail>(`/api/admin/playlists/${id}`),
      api<{ songs: SongOption[] }>('/api/admin/songs/options'),
    ])
      .then(
        ([detail, options]) =>
          alive &&
          setState({ status: 'ready', detail, options: options.songs }),
      )
      .catch((err: unknown) => {
        if (!alive) return;
        setState({
          status: 'error',
          message:
            err instanceof ApiError && err.status === 404
              ? '播放列表不存在'
              : '加载失败',
        });
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (state.status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }
  if (state.status === 'error') {
    return (
      <Container sx={{ pt: 8 }}>
        <Typography variant="h6">{state.message}</Typography>
      </Container>
    );
  }

  const { detail, options } = state;
  return (
    <>
      <title>{pageTitle(`管理 ${detail.playlist.name}`)}</title>
      <PlaylistSongsClient
        key={id}
        playlist={{
          id: detail.playlist.id,
          name: detail.playlist.name,
          songs: detail.songs,
        }}
        availableSongs={options}
      />
    </>
  );
}
