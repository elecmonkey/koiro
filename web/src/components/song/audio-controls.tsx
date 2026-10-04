import { useState } from 'react';
import { Button, Stack, Tab, Tabs } from '@mui/material';
import { Download } from '@mui/icons-material';
import type { SongDetail } from '@koiro/shared';
import { audioDownloadUrl } from '@/api';
import { artistOf } from '@/stores/player';
import { defaultIndex } from '@/utils/default-index';
import { PlayButton } from './play-button';

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
