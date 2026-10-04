import { languageName, type SongDetail } from '@koiro/shared';
import { Chip, Stack, Typography } from '@mui/material';
import { CoverArt } from '@/components/ui/cover-art';
import { AudioControls } from './audio-controls';

/** 歌曲详情顶部：封面、标题、简介、staff、语种与播放 / 下载 */
export function SongHeader({
  song,
  canDownload,
}: {
  song: SongDetail;
  canDownload: boolean;
}) {
  const defaultLyrics = song.lyrics.find((item) => item.isDefault);
  return (
    <Stack spacing={3}>
      <CoverArt
        url={song.coverUrl}
        height="auto"
        width="100%"
        alt={song.title}
      />
      <Stack spacing={2}>
        <Stack spacing={1}>
          <Typography variant="h4">{song.title}</Typography>
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', whiteSpace: 'pre-line' }}
          >
            {song.description}
          </Typography>
        </Stack>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ flexWrap: 'wrap', alignItems: 'center' }}
        >
          {song.staff.map((credit, index) => (
            <Chip
              key={`${credit.role}-${String(index)}`}
              label={`${credit.role} · ${credit.names.join('、')}`}
            />
          ))}
          {defaultLyrics?.languages.map((language) => (
            <Chip
              key={language}
              label={languageName(language)}
              size="small"
              color="primary"
              variant="outlined"
            />
          ))}
        </Stack>
        <AudioControls key={song.id} song={song} canDownload={canDownload} />
      </Stack>
    </Stack>
  );
}
