import {
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { SongFormState } from './use-song-form';

/** 粘贴或选择 LRC 文件，导入后覆盖当前歌词版本的内容 */
export function LrcImportCard({ form }: { form: SongFormState }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="subtitle1">导入 LRC</Typography>
          <TextField
            label="粘贴 LRC 内容"
            value={form.lrcText}
            onChange={(event) => form.setLrcText(event.target.value)}
            multiline
            minRows={6}
            maxRows={6}
            fullWidth
            sx={{
              '& .MuiInputBase-root': {
                alignItems: 'flex-start',
                overflow: 'auto',
              },
            }}
          />
          <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              onClick={() => form.importLrc(form.lrcText)}
            >
              从粘贴内容导入
            </Button>
            <Button variant="outlined" component="label">
              选择 LRC 文件
              <input
                hidden
                type="file"
                accept=".lrc,text/plain"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const content =
                      typeof reader.result === 'string' ? reader.result : '';
                    form.setLrcText(content);
                    form.importLrc(content);
                  };
                  reader.readAsText(file);
                }}
              />
            </Button>
          </Stack>
          {form.lrcError ? (
            <Typography variant="caption" color="error">
              {form.lrcError}
            </Typography>
          ) : null}
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            导入会覆盖当前版本的歌词内容。
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
