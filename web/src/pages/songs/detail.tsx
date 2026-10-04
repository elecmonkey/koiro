import {
  hasPermission,
  languageName,
  type Page,
  type SongDetail,
  type SongSummary,
} from '@koiro/shared';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  Box,
  Chip,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import CoverArt from '@/components/ui/cover-art';
import { useCurrentUser } from '@/query';
import { api, ApiError, withQuery } from '@/lib/api';
import { pageTitle } from '@/utils/page-title';
import { AudioControls, LyricsCard } from '@/components/song/song-detail-parts';

type State =
  | { status: 'loading' }
  | { status: 'not-found'; recent: SongSummary[] }
  | { status: 'error' }
  | { status: 'ready'; song: SongDetail };

/** 歌曲不存在时给出最近更新的几首作为入口 */
async function recentSongs(): Promise<SongSummary[]> {
  try {
    const page = await api<Page<SongSummary>>(
      withQuery('/api/songs', { pageSize: 5 }),
    );
    return page.items;
  } catch {
    return [];
  }
}

export default function SongDetailPage() {
  const { id = '' } = useParams();
  const user = useCurrentUser();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    setState({ status: 'loading' });
    api<SongDetail>(`/api/songs/${id}`)
      .then((song) => alive && setState({ status: 'ready', song }))
      .catch(async (err: unknown) => {
        if (!alive) return;
        if (err instanceof ApiError && err.status === 404) {
          const recent = await recentSongs();
          if (alive) setState({ status: 'not-found', recent });
        } else {
          setState({ status: 'error' });
        }
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (state.status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <title>{pageTitle('歌曲详情')}</title>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (state.status === 'error') {
    return (
      <Container sx={{ pt: 8 }}>
        <title>{pageTitle('歌曲详情')}</title>
        <Typography variant="h6">加载失败，请稍后重试</Typography>
      </Container>
    );
  }

  if (state.status === 'not-found') {
    return (
      <Container sx={{ pt: 8 }}>
        <title>{pageTitle('未找到歌曲')}</title>
        <Stack spacing={2}>
          <Typography variant="h6">未找到歌曲</Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
            }}
          >
            ID: {id}
          </Typography>
          {state.recent.length > 0 ? (
            <Stack spacing={1}>
              <Typography variant="subtitle2">最近更新</Typography>
              {state.recent.map((item) => (
                <Link key={item.id} to={`/songs/${item.id}`}>
                  <Typography variant="body2">{item.title}</Typography>
                </Link>
              ))}
            </Stack>
          ) : null}
        </Stack>
      </Container>
    );
  }

  const { song } = state;
  const canDownload = user !== null && hasPermission(user, 'download');
  const defaultLyrics = song.lyrics.find((item) => item.isDefault);

  return (
    <Box component="main" sx={{ pb: 8 }}>
      <title>{pageTitle(song.title)}</title>
      <meta
        name="description"
        content={song.description || `收听 ${song.title}`}
      />
      <Container sx={{ pt: 6 }}>
        <Stack spacing={3}>
          <Stack spacing={3}>
            <CoverArt
              url={song.coverUrl}
              height="auto"
              width="100%"
              alt={song.title}
            />
            <Stack spacing={2}>
              <Stack spacing={1}>
                <Typography variant="h4">{song.title}</Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {song.description}
                </Typography>
              </Stack>
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                {song.staff.map((item, index) => (
                  <Chip
                    key={`${item.role}-${index}`}
                    label={`${item.role} · ${item.names.join('、')}`}
                  />
                ))}
                {defaultLyrics?.languages.map((lang) => (
                  <Chip
                    key={lang}
                    label={languageName(lang)}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Stack>

              {/* 音频控制：版本切换 + 播放/下载 */}
              <AudioControls
                key={song.id}
                song={song}
                canDownload={canDownload}
              />
            </Stack>
          </Stack>
        </Stack>
      </Container>

      <Container sx={{ pt: 4 }}>
        <Stack spacing={3}>
          {/* 歌词显示：支持多版本切换 */}
          <LyricsCard key={song.id} lyrics={song.lyrics} />
        </Stack>
      </Container>
    </Box>
  );
}
