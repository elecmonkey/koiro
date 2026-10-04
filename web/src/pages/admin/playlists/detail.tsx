import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Box, CircularProgress, Container, Typography } from '@mui/material';
import type { Playlist, SongOption, SongSummary } from '@koiro/shared';
import { api, ApiError, fetchAllPages } from '@/lib/api';
import { pageTitle } from '@/utils/page-title';
import PlaylistSongsClient from '@/components/playlist/playlist-songs-manager';

export default function PlaylistManagePage() {
  const { id = '' } = useParams();
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | {
        status: 'ready';
        playlist: Playlist;
        songs: SongOption[];
        options: SongOption[];
      }
  >({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    Promise.all([
      api<Playlist>(`/api/playlists/${id}`),
      fetchAllPages<SongSummary>('/api/songs', { playlist: id }),
      api<SongOption[]>('/api/songs/options'),
    ])
      .then(
        ([playlist, songs, options]) =>
          alive &&
          setState({
            status: 'ready',
            playlist,
            songs: songs.map(({ id, title }) => ({ id, title })),
            options,
          }),
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

  const { playlist, songs, options } = state;
  return (
    <>
      <title>{pageTitle(`管理 ${playlist.name}`)}</title>
      <PlaylistSongsClient
        key={id}
        playlist={playlist}
        initialSongs={songs}
        availableSongs={options}
      />
    </>
  );
}
