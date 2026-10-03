import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Box, CircularProgress, Container, Typography } from '@mui/material';
import SongForm, { type SongFormData } from '@/app/upload/SongForm';
import { toLines, type LyricsContent } from '@/app/editor/ast/toLines';
import { api, ApiError, type Cover, type StaffEntry } from '@/lib/api';
import { pageTitle } from '@/lib/site-config';

type SongEditData = {
  id: string;
  title: string;
  description: string;
  staff: StaffEntry[];
  coverObjectId: string | null;
  cover: Cover | null;
  versions: {
    id: string;
    name: string;
    objectId: string;
    isDefault: boolean;
    lyricsId: string | null;
  }[];
  lyrics: {
    id: string;
    key: string;
    isDefault: boolean;
    content: LyricsContent;
  }[];
  playlistIds: string[];
};

function toFormData(song: SongEditData): SongFormData {
  return {
    title: song.title,
    description: song.description,
    staff: song.staff.map((s, index) => ({
      id: `staff_${index}`,
      role: s.role,
      name: s.name.length === 1 ? s.name[0] : s.name,
    })),
    versions: song.versions.map((v) => ({
      id: v.id,
      key: v.name,
      objectId: v.objectId,
      isDefault: v.isDefault,
      lyricsId: v.lyricsId,
    })),
    audioDefaultName:
      song.versions.find((v) => v.isDefault)?.name ??
      song.versions[0]?.name ??
      null,
    lyricsVersions: song.lyrics.map((l) => ({
      id: l.id,
      key: l.key,
      isDefault: l.isDefault,
      lines: toLines(l.id, l.content),
      languages: l.content.meta?.languages ?? ['ja'],
    })),
    coverObjectId: song.coverObjectId,
    coverPreviewUrl: song.cover?.url ?? null,
    coverFilename: null,
    playlistIds: song.playlistIds,
  };
}

export default function EditSongPage() {
  const { id = '' } = useParams();
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; title: string; data: SongFormData }
  >({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    api<SongEditData>(`/api/songs/${id}/edit`)
      .then(
        (song) =>
          alive &&
          setState({
            status: 'ready',
            title: song.title,
            data: toFormData(song),
          }),
      )
      .catch((err: unknown) => {
        if (!alive) return;
        const message =
          err instanceof ApiError && err.status === 404
            ? '未找到歌曲'
            : '加载失败';
        setState({ status: 'error', message });
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (state.status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <title>{pageTitle('编辑歌曲')}</title>
        <CircularProgress size={28} />
      </Box>
    );
  }
  if (state.status === 'error') {
    return (
      <Container sx={{ pt: 8 }}>
        <title>{pageTitle('编辑歌曲')}</title>
        <Typography variant="h6">{state.message}</Typography>
      </Container>
    );
  }
  return (
    <>
      <title>{pageTitle(`编辑 ${state.title}`)}</title>
      <SongForm key={id} mode="edit" songId={id} initialData={state.data} />
    </>
  );
}
