import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Box, CircularProgress, Container, Typography } from '@mui/material';
import type { SongDetail, SongInput } from '@koiro/shared';
import SongForm from '@/app/upload/SongForm';
import type { SongFormData } from '@/app/upload/formTypes';
import { toLineDrafts } from '@/app/editor/lines';
import { api, ApiError } from '@/lib/api';
import { pageTitle } from '@/lib/site-config';

/** 接口的歌曲输入 → 表单数据；表单内的条目用本地 id 互相引用 */
function toFormData(input: SongInput, coverUrl: string): SongFormData {
  const lyrics = input.lyrics.map((item, index) => ({
    id: `lyr_${String(index)}`,
    name: item.name,
    isDefault: item.isDefault,
    lines: toLineDrafts(item.lines, `lyr_${String(index)}`),
    languages: item.languages,
  }));
  const lyricsIdByName = new Map(lyrics.map((item) => [item.name, item.id]));
  return {
    title: input.title,
    description: input.description,
    staff: input.staff.map((credit, index) => ({
      id: `staff_${String(index)}`,
      role: credit.role,
      names: credit.names,
    })),
    versions: input.versions.map((version, index) => ({
      id: `ver_${String(index)}`,
      name: version.name,
      objectId: version.objectId,
      isDefault: version.isDefault,
      lyricsId:
        version.lyricsName === null
          ? null
          : (lyricsIdByName.get(version.lyricsName) ?? null),
    })),
    lyrics,
    coverObjectId: input.coverObjectId,
    coverPreviewUrl: coverUrl,
    coverFilename: null,
    playlistIds: input.playlistIds,
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
    Promise.all([
      api<SongInput>(`/api/songs/${id}/input`),
      api<SongDetail>(`/api/songs/${id}`),
    ])
      .then(
        ([input, song]) =>
          alive &&
          setState({
            status: 'ready',
            title: song.title,
            data: toFormData(input, song.coverUrl),
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
