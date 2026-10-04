import { Stack, Typography } from '@mui/material';
import { Link } from 'react-router';
import { useSongs } from '@/query';

/** 最近更新的歌曲数，作为找不到时的入口 */
const RECENT_COUNT = 5;

/** 歌曲不存在：给出最近更新的几首作为入口 */
export function SongNotFound({ id }: { id: string }) {
  const recent = useSongs({ pageSize: RECENT_COUNT });
  return (
    <Stack spacing={2}>
      <Typography variant="h6">未找到歌曲</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        ID: {id}
      </Typography>
      {recent.data && recent.data.items.length > 0 && (
        <Stack spacing={1}>
          <Typography variant="subtitle2">最近更新</Typography>
          {recent.data.items.map((song) => (
            <Link key={song.id} to={`/songs/${song.id}`}>
              <Typography variant="body2">{song.title}</Typography>
            </Link>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
