import { Box, Button, Container, Stack } from '@mui/material';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import { Link } from 'react-router';
import { HomeHero } from '@/components/layout/home-hero';
import { PlaylistCard } from '@/components/playlist/playlist-card';
import { SongCard } from '@/components/song/song-card';
import { PageState } from '@/components/ui/page-state';
import { SectionCard } from '@/components/ui/section-card';
import { useRandomPlaylists, useRandomSongs } from '@/query';
import { pageTitle } from '@/utils/page-title';

export default function HomePage() {
  const songs = useRandomSongs();
  const playlists = useRandomPlaylists();

  return (
    <Box component="main" sx={{ pb: 10 }}>
      <title>{pageTitle()}</title>
      <HomeHero />

      <Container sx={{ pt: 2 }}>
        <SectionCard
          icon={
            <QueueMusicIcon sx={{ fontSize: 24, color: 'text.secondary' }} />
          }
          title="随机歌单"
          actions={
            <>
              <Button component={Link} to="/playlists" size="small">
                全部歌单
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => void playlists.refetch()}
                disabled={playlists.isFetching}
              >
                换一批
              </Button>
            </>
          }
        >
          <PageState
            loading={playlists.isPending}
            error={playlists.error}
            empty={playlists.data?.length === 0 && '暂无歌单'}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, 1fr)',
                  sm: 'repeat(3, 1fr)',
                  md: 'repeat(4, 1fr)',
                },
                gap: 2,
              }}
            >
              {playlists.data?.map((playlist) => (
                <PlaylistCard key={playlist.id} playlist={playlist} />
              ))}
            </Box>
          </PageState>
        </SectionCard>
      </Container>

      <Container sx={{ pt: 2 }}>
        <SectionCard
          icon={<ShuffleIcon sx={{ fontSize: 24, color: 'text.secondary' }} />}
          title="随机音乐"
          actions={
            <>
              <Button component={Link} to="/songs" size="small">
                全部歌曲
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => void songs.refetch()}
                disabled={songs.isFetching}
              >
                换一批
              </Button>
            </>
          }
        >
          <PageState
            loading={songs.isPending}
            error={songs.error}
            empty={songs.data?.length === 0 && '暂无歌曲'}
          >
            <Stack spacing={2}>
              {songs.data?.map((song) => (
                <SongCard key={song.id} song={song} />
              ))}
            </Stack>
          </PageState>
        </SectionCard>
      </Container>
    </Box>
  );
}
