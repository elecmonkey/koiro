import type { Language } from '@koiro/shared';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { useLyricsEditor, type LineDraft } from './state/useLyricsEditor';
import LineList from './components/LineList';
import LineEditor from './components/LineEditor';
import PreviewPanel from './components/PreviewPanel';
import { lineErrors } from './lines';

type EditorShellProps = {
  initialLines?: LineDraft[];
  onLinesChange?: (lines: LineDraft[]) => void;
  /** 预览时决定字体 */
  languages?: Language[];
};

export default function EditorShell({
  initialLines,
  onLinesChange,
  languages = [],
}: EditorShellProps) {
  const {
    lines,
    selectedId,
    selectedLine,
    setSelectedId,
    updateLine,
    addLine,
    removeLine,
    moveLine,
    preview,
  } = useLyricsEditor({
    initial: initialLines,
    onChange: onLinesChange,
  });

  const errors = lineErrors(preview);

  return (
    <Stack spacing={3} sx={{ py: 4 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: '1fr 1.6fr 1.2fr',
          },
          gap: 2,
          alignItems: 'start',
        }}
      >
        <Box>
          <Card variant="outlined">
            <CardContent>
              <LineList
                lines={lines}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onAdd={addLine}
                onRemove={removeLine}
                onMove={moveLine}
              />
            </CardContent>
          </Card>
        </Box>
        <Box
          sx={{
            position: { md: 'sticky' },
            top: { md: 80 },
            alignSelf: 'start',
          }}
        >
          <Card variant="outlined">
            <CardContent>
              <LineEditor line={selectedLine} onChange={updateLine} />
            </CardContent>
          </Card>
        </Box>
        <Box>
          <Card variant="outlined">
            <CardContent>
              <PreviewPanel lines={preview} languages={languages} />
            </CardContent>
          </Card>
          {errors.length > 0 ? (
            <Card variant="outlined" sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" color="error">
                  校验错误
                </Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {errors.map((error) => (
                    <Typography key={error} variant="caption" color="error">
                      {error}
                    </Typography>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          ) : null}
        </Box>
      </Box>
    </Stack>
  );
}
