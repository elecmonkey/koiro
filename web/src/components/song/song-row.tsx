import type { SongSummary } from '@koiro/shared';
import { Box, Button, Chip, Divider, Stack, Typography } from '@mui/material';
import { Link } from 'react-router';
import { formatDate } from '@/utils/format-date';

/** 管理列表里的一首歌：标题、staff、版本与歌词数，以及编辑 / 查看 / 删除的入口 */
export function SongRow({
  song,
  onDelete,
}: {
  song: SongSummary;
  onDelete: () => void;
}) {
  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1">{song.title}</Typography>
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: 'wrap', mt: 0.5 }}
          >
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {song.versionCount} 个音频版本
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              · {song.lyricsCount} 份歌词
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              · 更新于 {formatDate(song.updatedAt)}
            </Typography>
          </Stack>
          {song.staff.length > 0 && (
            <Stack
              direction="row"
              spacing={0.5}
              useFlexGap
              sx={{ flexWrap: 'wrap', mt: 1 }}
            >
              {song.staff.map((credit, index) => (
                <Chip
                  key={index}
                  label={`${credit.role} · ${credit.names.join('、')}`}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Stack>
          )}
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Button
            component={Link}
            to={`/songs/${song.id}/edit`}
            size="small"
            variant="outlined"
          >
            编辑
          </Button>
          <Button
            component={Link}
            to={`/songs/${song.id}`}
            size="small"
            variant="text"
          >
            查看
          </Button>
          <Button size="small" color="error" onClick={onDelete}>
            删除
          </Button>
        </Stack>
      </Stack>
      <Divider sx={{ my: 2 }} />
    </Box>
  );
}
