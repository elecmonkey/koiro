import { Box, Stack, Typography } from '@mui/material';
import type { Language, LyricLine, Span } from '@koiro/shared';
import { lyricsFontFamily } from '@/utils/lyrics-font';

type PreviewPanelProps = {
  lines: readonly LyricLine[];
  languages: readonly Language[];
};

/** 按提交后的样子预览歌词 */
export function PreviewPanel({ lines, languages }: PreviewPanelProps) {
  const fontFamily = lyricsFontFamily(languages);
  return (
    <Stack spacing={2}>
      <Typography variant="subtitle1">预览</Typography>
      <Box
        sx={{
          border: '1px solid rgba(31, 26, 22, 0.12)',
          p: 2,
          minHeight: 200,
          background: '#fff',
        }}
      >
        {lines.map((line, index) => (
          <Stack
            key={index}
            direction="row"
            spacing={2}
            sx={{
              alignItems: 'baseline',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                minWidth: 72,
              }}
            >
              {line.startMs}ms
            </Typography>
            <Typography variant="body1" sx={{ fontFamily }}>
              {line.spans.map((span, spanIndex) => (
                <SpanView key={spanIndex} span={span} />
              ))}
            </Typography>
          </Stack>
        ))}
      </Box>
    </Stack>
  );
}

function SpanView({ span }: { span: Span }) {
  switch (span.type) {
    case 'text':
      return <span>{span.text}</span>;
    case 'ruby':
      return (
        <ruby>
          {span.base}
          <rt style={{ fontSize: '0.7em' }}>{span.ruby}</rt>
        </ruby>
      );
  }
}
