"use client";

import { Button } from "@mui/material";
import { PlayArrow, Pause } from "@mui/icons-material";
import { usePlayer, type Track } from "@/app/player";

interface PlayButtonProps {
  track: Track;
}

export function PlayButton({ track }: PlayButtonProps) {
  const { play, pause, resume, track: currentTrack, isPlaying, isLoading } = usePlayer();

  // 通过歌曲 ID 和 audioObjectId 同时匹配，确保是同一个版本
  const isCurrentTrack = 
    currentTrack?.id === track.id && 
    currentTrack?.audioObjectId === track.audioObjectId;

  const handleClick = async () => {
    if (isCurrentTrack) {
      if (isPlaying) {
        pause();
      } else {
        resume();
      }
    } else {
      await play(track);
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
        ? "加载中..."
        : isCurrentTrack && isPlaying
          ? "暂停"
          : "在线播放"}
    </Button>
  );
}
