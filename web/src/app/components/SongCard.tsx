import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import { Link } from 'react-router';
import type { SongSummary } from '@koiro/shared';
import { trackOf, usePlayer } from '@/app/player';

type SongCardProps = {
  song: SongSummary;
  showPlayButton?: boolean;
};

export default function SongCard({
  song,
  showPlayButton = true,
}: SongCardProps) {
  const {
    play,
    pause,
    resume,
    track: currentTrack,
    isPlaying,
    isLoading,
  } = usePlayer();

  // 播放默认版本
  const track = trackOf(song);
  const coverUrl = song.coverUrl;

  // 按音频版本匹配，确保是同一个版本
  const isCurrentTrack = currentTrack?.versionId === track.versionId;

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isCurrentTrack) {
      if (isPlaying) {
        pause();
      } else {
        resume();
      }
    } else {
      void play(track);
    }
  };

  return (
    <Card
      variant="outlined"
      sx={{
        position: 'relative',
        transition: 'border-color 0.2s',
        overflow: 'hidden',
        '&:hover': {
          borderColor: 'primary.main',
        },
      }}
    >
      {/* 移动端背景封面 */}
      {coverUrl && (
        <Box
          sx={{
            display: { xs: 'block', sm: 'none' },
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '45%',
            background: `url(${coverUrl}) center/cover no-repeat`,
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: '60%',
              background: (theme) =>
                `linear-gradient(to right, transparent, ${theme.palette.background.paper})`,
            },
          }}
        />
      )}

      <CardActionArea
        component={Link}
        to={`/songs/${song.id}`}
        sx={{ height: { xs: 'auto', sm: 72 } }}
      >
        <CardContent
          sx={{
            py: { xs: 2, sm: 0 },
            pl: { xs: 2, sm: 0 },
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          <Stack
            direction="row"
            spacing={2}
            sx={{
              alignItems: { xs: 'flex-start', sm: 'center' },
              width: '100%',
              pr: showPlayButton && track ? 6 : 0,
            }}
          >
            {/* 封面 - 仅桌面端显示 */}
            <Box
              sx={{
                display: { xs: 'none', sm: 'flex' },
                width: 72,
                height: 72,
                flexShrink: 0,
                background: coverUrl
                  ? `url(${coverUrl}) center/cover no-repeat`
                  : 'linear-gradient(135deg, #f3efe7, #e8dfd1)',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.disabled',
                fontSize: 24,
              }}
            >
              {!coverUrl && '♪'}
            </Box>

            {/* 歌曲信息 */}
            <Box sx={{ flex: 1, minWidth: 0, pl: { xs: '30%', sm: 0 } }}>
              <Typography
                variant="subtitle1"
                noWrap
                sx={{
                  color: 'text.primary',
                }}
              >
                {song.title}
              </Typography>
              {song.staff.length > 0 && (
                <Stack
                  direction="row"
                  spacing={0.5}
                  useFlexGap
                  sx={{
                    flexWrap: 'wrap',
                    mt: 0.5,
                  }}
                >
                  {song.staff.slice(0, 3).map((s, idx) => (
                    <Chip
                      key={idx}
                      label={`${s.role} · ${s.names.join('、')}`}
                      size="small"
                      variant="outlined"
                      sx={{
                        bgcolor: {
                          xs: 'rgba(255,255,255,0.8)',
                          sm: 'transparent',
                        },
                        backdropFilter: { xs: 'blur(4px)', sm: 'none' },
                      }}
                    />
                  ))}
                  {song.staff.length > 3 && (
                    <Chip
                      label={`+${song.staff.length - 3}`}
                      size="small"
                      variant="outlined"
                      sx={{
                        bgcolor: {
                          xs: 'rgba(255,255,255,0.8)',
                          sm: 'transparent',
                        },
                        backdropFilter: { xs: 'blur(4px)', sm: 'none' },
                      }}
                    />
                  )}
                </Stack>
              )}
            </Box>
          </Stack>
        </CardContent>
      </CardActionArea>

      {/* 播放按钮 - 放在 CardActionArea 外部避免 button 嵌套 */}
      {showPlayButton && (
        <IconButton
          size="small"
          color="primary"
          onClick={handlePlayClick}
          disabled={isLoading && !!isCurrentTrack}
          sx={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            width: 36,
            height: 36,
            '&:hover': { bgcolor: 'primary.dark' },
          }}
        >
          {isCurrentTrack && isPlaying ? (
            <PauseIcon fontSize="small" />
          ) : (
            <PlayArrowIcon fontSize="small" />
          )}
        </IconButton>
      )}
    </Card>
  );
}
