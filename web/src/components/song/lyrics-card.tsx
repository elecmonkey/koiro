import { useState } from 'react';
import { Card, CardContent, Stack, Tab, Tabs, Typography } from '@mui/material';
import type { LyricLine, Lyrics, Span } from '@koiro/shared';
import { defaultIndex } from '@/utils/default-index';
import { lyricsFontFamily } from '@/utils/lyrics-font';

/** 歌词全文，多份歌词时可以切换 */
export function LyricsCard({ lyrics }: { lyrics: readonly Lyrics[] }) {
  const [selected, setSelected] = useState(() => defaultIndex(lyrics));
  const current = selected < lyrics.length ? lyrics[selected] : undefined;

  return (
    <Card className="float-in">
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6">歌词</Typography>
          {current === undefined ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              暂无歌词
            </Typography>
          ) : (
            <>
              {lyrics.length > 1 && (
                <Tabs
                  value={selected}
                  onChange={(_, value: number) => setSelected(value)}
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  {lyrics.map((item, index) => (
                    <Tab
                      key={item.id}
                      label={
                        item.isDefault ? `${item.name}（默认）` : item.name
                      }
                      value={index}
                    />
                  ))}
                </Tabs>
              )}
              <Stack spacing={1}>
                {current.lines.map((line, index) => (
                  <LineView
                    key={index}
                    line={line}
                    fontFamily={lyricsFontFamily(current.languages)}
                  />
                ))}
              </Stack>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

function LineView({
  line,
  fontFamily,
}: {
  line: LyricLine;
  fontFamily: string | undefined;
}) {
  return (
    <Typography variant="body1" sx={{ lineHeight: 1.9, fontFamily }}>
      {line.spans.map((span, index) => (
        <SpanView key={index} span={span} />
      ))}
    </Typography>
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
