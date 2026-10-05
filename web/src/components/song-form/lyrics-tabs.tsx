import { Button, Stack, Typography } from '@mui/material';
import type { SongFormState } from './use-song-form';

/** 歌词版本的切换与新增 */
export function LyricsTabs({ form }: { form: SongFormState }) {
  return (
    <Stack spacing={1}>
      <Typography variant="h6">歌词版本</Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        {form.lyricsVersions.map((item) => (
          <Button
            key={item.id}
            variant={item.id === form.activeLyricsId ? 'contained' : 'outlined'}
            size="small"
            onClick={() => form.setActiveLyricsId(item.id)}
          >
            {item.name || '未命名'}
          </Button>
        ))}
        <Button size="small" variant="text" onClick={form.addLyricsVersion}>
          添加歌词版本
        </Button>
      </Stack>
    </Stack>
  );
}
