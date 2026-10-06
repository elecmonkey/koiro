import type { SongId, SongInput } from '@koiro/shared';
import { useState } from 'react';
import { Box, Container, Snackbar, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router';
import { toLyricLines } from '@/components/lyrics-editor/lines';
import { useCreateSong, useReplaceSong } from '@/query';
import { LyricsSection } from './lyrics-section';
import { SongInfoSection } from './song-info-section';
import { SubmitBar } from './submit-bar';
import type { SongFormData } from './form-types';
import { useSongForm } from './use-song-form';

/** 跳转回歌曲详情前，让用户看到「保存成功」提示的时长 */
const SAVED_REDIRECT_DELAY_MS = 1000;

type SongFormProps = {
  /** 编辑模式时传入歌曲 ID */
  songId?: SongId;
  /** 编辑模式时传入初始数据 */
  initialData?: SongFormData;
  /** 模式：create 使用草稿存储，edit 不使用 */
  mode: 'create' | 'edit';
};

export function SongForm({ songId, initialData, mode }: SongFormProps) {
  const navigate = useNavigate();
  const form = useSongForm(mode, initialData);
  const createSong = useCreateSong();
  const replaceSong = useReplaceSong(songId ?? '');

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const isSubmitting = createSong.isPending || replaceSong.isPending;
  const isEditMode = mode === 'edit';

  const handleSubmit = () => {
    const error = form.validate();
    setSubmitError(error);
    if (error || isSubmitting) return;

    // 音频版本以歌词名（同一首歌内唯一）绑定歌词
    const lyricsNameById = new Map(
      form.lyricsVersions.map((l) => [l.id, l.name]),
    );
    const payload: SongInput = {
      title: form.title,
      description: form.description,
      coverObjectId: form.coverObjectId ?? '',
      staff: form.staff.map(({ role, names }) => ({ role, names })),
      versions: form.versions.map((v) => ({
        name: v.name,
        objectId: v.objectId,
        isDefault: v.isDefault,
        lyricsName: v.lyricsId
          ? (lyricsNameById.get(v.lyricsId) ?? null)
          : null,
      })),
      lyrics: form.lyricsVersions.map((l) => ({
        name: l.name,
        isDefault: l.isDefault,
        languages: l.languages,
        lines: toLyricLines(l.lines),
      })),
    };
    submit(payload);
  };

  const submit = (payload: SongInput) => {
    const onError = (err: unknown) => {
      setSubmitError(err instanceof Error ? err.message : '提交失败');
    };
    const onSuccess = () => {
      setSubmitError(null);
      setSubmitSuccess(true);
      if (mode === 'create') {
        form.clearDraftAndReset();
      } else {
        setTimeout(
          () => void navigate(`/songs/${songId}`),
          SAVED_REDIRECT_DELAY_MS,
        );
      }
    };
    if (mode === 'edit') {
      replaceSong.mutate(payload, { onSuccess, onError });
    } else {
      createSong.mutate(
        {
          ...payload,
          playlistIds: form.selectedPlaylists.map((p) => p.id),
        },
        { onSuccess, onError },
      );
    }
  };

  return (
    <>
      <Box component="main" sx={{ pb: 8 }}>
        <Container sx={{ pt: 6 }}>
          <Stack spacing={1}>
            <Typography variant="h4">
              {isEditMode ? '编辑歌曲' : '上传歌曲'}
            </Typography>
          </Stack>
        </Container>

        <Container sx={{ pt: 4 }}>
          <Stack spacing={3}>
            <SongInfoSection form={form} />
            <LyricsSection form={form} />
            <SubmitBar
              mode={mode}
              isSubmitting={isSubmitting}
              submitError={submitError}
              onSubmit={handleSubmit}
              onClearDraft={form.clearDraftAndReset}
              onCancel={() => void navigate(`/songs/${songId}`)}
            />
          </Stack>
        </Container>
      </Box>
      <Snackbar
        open={submitSuccess}
        autoHideDuration={2200}
        message={isEditMode ? '保存成功' : '提交成功'}
        onClose={() => setSubmitSuccess(false)}
      />
    </>
  );
}
