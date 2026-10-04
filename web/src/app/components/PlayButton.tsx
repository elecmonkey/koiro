import { Button } from '@mui/material';
import { PlayArrow, Pause } from '@mui/icons-material';
import type { Lyrics } from '@koiro/shared';
import { usePlayer, type Track } from '@/app/player';

interface PlayButtonProps {
  track: Track;
  /** 手头已有的歌词；不传时播放器按 `track.lyricsId` 加载 */
  lyrics?: Lyrics | null;
}

export function PlayButton({ track, lyrics }: PlayButtonProps) {
  const {
    play,
    pause,
    resume,
    track: currentTrack,
    isPlaying,
    isLoading,
  } = usePlayer();

  // 按音频版本匹配，确保是同一个版本
  const isCurrentTrack = currentTrack?.versionId === track.versionId;

  const handleClick = async () => {
    if (isCurrentTrack) {
      if (isPlaying) {
        pause();
      } else {
        resume();
      }
    } else {
      await play(track, lyrics);
    }
  };

  return (
    <Button
      variant="contained"
      onClick={handleClick}
      disabled={isLoading && isCurrentTrack}
      startIcon={
        isLoading && isCurrentTrack ? null : isCurrentTrack && isPlaying ? (
          <Pause />
        ) : (
          <PlayArrow />
        )
      }
    >
      {isLoading && isCurrentTrack
        ? '加载中...'
        : isCurrentTrack && isPlaying
          ? '暂停'
          : '在线播放'}
    </Button>
  );
}
