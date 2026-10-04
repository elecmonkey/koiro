import type { SongSummary } from '@koiro/shared';
import { Stack } from '@mui/material';
import { SongCard } from './song-card';

/** 歌曲卡片列表 */
export function SongList({ songs }: { songs: readonly SongSummary[] }) {
  return (
    <Stack spacing={2}>
      {songs.map((song) => (
        <SongCard key={song.id} song={song} />
      ))}
    </Stack>
  );
}
