import { Button, Stack, Typography } from '@mui/material';
import { VersionRow } from './version-row';
import type { SongFormState } from './use-song-form';

/** 音频版本列表：每个版本可上传音频、绑定歌词、设为默认，可增删 */
export function VersionSection({ form }: { form: SongFormState }) {
  return (
    <Stack spacing={1.5}>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Typography variant="subtitle1">音频版本</Typography>
        <Button size="small" variant="outlined" onClick={form.addVersion}>
          添加版本
        </Button>
      </Stack>
      <Stack spacing={2}>
        {form.versions.map((item) => (
          <VersionRow
            key={`${item.id}-${form.uploadComponentKey}`}
            item={item}
            onChange={form.updateVersion}
            onRemove={form.removeVersion}
            onSetDefault={form.setDefaultVersion}
            lyrics={form.lyricsVersions}
          />
        ))}
      </Stack>
    </Stack>
  );
}
