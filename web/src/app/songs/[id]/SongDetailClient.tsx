import { useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { Download } from '@mui/icons-material';
import type { LyricLine, Lyrics, SongDetail, Span } from '@koiro/shared';
import { PlayButton } from '@/app/components/PlayButton';
import { artistOf } from '@/app/player';
import { lyricsFontFamily } from '@/lib/lyricsFont';
import { audioDownloadUrl } from '@/lib/api';

/** 默认项的位置；接口保证恰好有一个，这里只防空列表 */
function defaultIndex(items: readonly { isDefault: boolean }[]) {
  return Math.max(
    items.findIndex((item) => item.isDefault),
    0,
  );
}

/** 音频版本切换，以及播放 / 下载当前版本 */
export function AudioControls({
  song,
  canDownload,
}: {
  song: SongDetail;
  canDownload: boolean;
}) {
  const [selected, setSelected] = useState(() => defaultIndex(song.versions));
  const version = song.versions[selected];
  const lyrics =
    song.lyrics.find((item) => item.id === version.lyricsId) ?? null;

  // 后端校验下载权限，并以「歌名 - 版本名」作为附件文件名
  const handleDownload = () => {
    if (canDownload) window.location.assign(audioDownloadUrl(version.id));
  };

  return (
    <Stack spacing={2}>
      {song.versions.length > 1 && (
        <Tabs
          value={selected}
          onChange={(_, value: number) => setSelected(value)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {song.versions.map((item, index) => (
            <Tab
              key={item.id}
              label={item.isDefault ? `${item.name}（默认）` : item.name}
              value={index}
            />
          ))}
        </Tabs>
      )}

      <Stack direction="row" spacing={1.5}>
        <PlayButton
          track={{
            songId: song.id,
            title: song.title,
            artist: artistOf(song.staff),
            coverUrl: song.coverUrl,
            versionId: version.id,
            versionName: version.name,
            lyricsId: version.lyricsId,
          }}
          lyrics={lyrics}
        />
        <Button
          variant="outlined"
          disabled={!canDownload}
          onClick={handleDownload}
          startIcon={<Download />}
        >
          下载{song.versions.length > 1 ? ` (${version.name})` : ''}
        </Button>
      </Stack>
    </Stack>
  );
}

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
