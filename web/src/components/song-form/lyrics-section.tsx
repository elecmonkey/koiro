import {
  Autocomplete,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  TextField,
} from '@mui/material';
import { LANGUAGES, LANGUAGE_NAMES } from '@koiro/shared';
import { EditorShell } from '@/components/lyrics-editor/editor-shell';
import { LrcImportCard } from './lrc-import-card';
import { LyricsTabs } from './lyrics-tabs';
import type { SongFormState } from './use-song-form';

/** 歌词版本卡片：切换版本、编辑名称与语种、设为默认或删除、导入 LRC、逐行编辑 */
export function LyricsSection({ form }: { form: SongFormState }) {
  const active = form.activeLyrics;
  return (
    <Card className="float-in stagger-2" sx={{ overflow: 'visible' }}>
      <CardContent sx={{ overflow: 'visible' }}>
        <Stack spacing={2}>
          <LyricsTabs form={form} />
          <Divider />
          {active && (
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  label="版本名称"
                  value={active.name}
                  onChange={(event) =>
                    form.updateLyricsName(active.id, event.target.value)
                  }
                  fullWidth
                />
                <Autocomplete
                  multiple
                  options={LANGUAGES}
                  getOptionLabel={(code) => `${LANGUAGE_NAMES[code]} (${code})`}
                  value={active.languages}
                  onChange={(_, value) =>
                    form.updateLyricsLanguages(active.id, value)
                  }
                  renderValue={(value, getItemProps) =>
                    value.map((option, index) => {
                      const { key, ...tagProps } = getItemProps({ index });
                      return (
                        <Chip
                          key={key}
                          label={LANGUAGE_NAMES[option]}
                          size="small"
                          {...tagProps}
                        />
                      );
                    })
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="语言标签"
                      placeholder="选择语言"
                    />
                  )}
                  sx={{ minWidth: 240 }}
                />
                <Button
                  variant={active.isDefault ? 'contained' : 'outlined'}
                  onClick={() => form.setDefaultLyrics(active.id)}
                  sx={{ height: 56, minWidth: 120 }}
                >
                  {active.isDefault ? '默认版本' : '设为默认'}
                </Button>
                {form.lyricsVersions.length > 0 ? (
                  <Button
                    color="error"
                    onClick={() => form.removeLyricsVersion(active.id)}
                    sx={{ height: 56 }}
                  >
                    删除
                  </Button>
                ) : null}
              </Stack>
              <LrcImportCard form={form} />
              <EditorShell
                key={`${active.id}-${form.lyricsEditorKey}`}
                initialLines={active.lines}
                onLinesChange={(lines) =>
                  form.updateLyricsLines(active.id, lines)
                }
                languages={active.languages}
              />
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
