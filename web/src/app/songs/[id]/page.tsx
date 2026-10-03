import { languageName } from '@koiro/shared';
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
import CoverArt from '@/app/components/CoverArt';
import type { LyricsDocument } from '@/app/editor/ast/types';
import { usePermissions } from '@/auth/AuthContext';
import {
  api,
  ApiError,
  type Cover,
  type SongSummary,
  type StaffEntry,
} from '@/lib/api';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';
import { pageTitle } from '@/lib/site-config';
import {
  AudioControls,
  LyricsDisplay,
  type AudioVersion,
  type LyricsVersion,
} from './SongDetailClient';

type SongDetail = {
  id: string;
  title: string;
  description: string;
  staff: StaffEntry[];
  cover: Cover | null;
  versions: {
    id: string;
    name: string;
    isDefault: boolean;
    lyricsId: string | null;
  }[];
  lyrics: {
    id: string;
    versionKey: string;
    isDefault: boolean;
    content: LyricsDocument;
  }[];
};

type State =
  | { status: 'loading' }
  | { status: 'not-found'; recent: SongSummary[] }
  | { status: 'error' }
  | { status: 'ready'; song: SongDetail };

/** 歌曲不存在时给出最近更新的几首作为入口 */
async function recentSongs(): Promise<SongSummary[]> {
  try {
    const data = await api<{ songs: SongSummary[] }>('/api/songs?page=1');
    return data.songs.slice(0, 5);
  } catch {
    return [];
  }
}

export default function SongDetailPage() {
  const { id = '' } = useParams();
  const permissions = usePermissions();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    setState({ status: 'loading' });
    api<{ song: SongDetail }>(`/api/songs/${id}`)
      .then(({ song }) => alive && setState({ status: 'ready', song }))
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
  const staff = song.staff;
  const coverUrl = song.cover?.url ?? null;
  const canDownload = hasPermission(permissions, PERMISSIONS.DOWNLOAD);

  const audioVersions: AudioVersion[] = song.versions.map((v) => ({
    id: v.id,
    key: v.name,
    isDefault: v.isDefault,
    lyricsId: v.lyricsId,
  }));

  const lyricsVersions: LyricsVersion[] = song.lyrics.map((lyr) => ({
    id: lyr.id,
    versionKey: lyr.versionKey,
    isDefault: lyr.isDefault,
    content: lyr.content,
    languages: lyr.content?.meta?.languages ?? [],
  }));

  // 艺术家信息：优先取演唱相关的 staff
  const artistInfo =
    staff
      .filter(
        (s) =>
          s.role?.toLowerCase().includes('vocal') || s.role?.includes('歌'),
      )
      .map((s) => s.name.join('、'))
      .join(', ') || staff[0]?.name.join('、');

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
              url={coverUrl}
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
                {staff.map((item, index) => (
                  <Chip
                    key={`${item.role}-${index}`}
                    label={`${item.role || 'Staff'} · ${item.name.join('、')}`}
                  />
                ))}
                {lyricsVersions[0]?.languages?.map((lang) => (
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
                song={{
                  id: song.id,
                  title: song.title,
                  artist: artistInfo,
                  coverUrl: song.cover?.url ?? null,
                }}
                audioVersions={audioVersions}
                canDownload={canDownload}
                lyricsVersions={lyricsVersions}
              />
            </Stack>
          </Stack>
        </Stack>
      </Container>

      <Container sx={{ pt: 4 }}>
        <Stack spacing={3}>
          {/* 歌词显示：支持多版本切换 */}
          <LyricsDisplay lyrics={lyricsVersions} />
        </Stack>
      </Container>
    </Box>
  );
}
