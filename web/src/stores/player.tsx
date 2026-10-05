import type {
  AudioVersionId,
  Lyrics,
  LyricsId,
  SongId,
  SongSummary,
  StaffCredit,
} from '@koiro/shared';
import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { audioUrl, fetchSong } from '@/api';
import { queryKeys } from '@/query';

/** 正在播放的一个音频版本 */
export interface Track {
  songId: SongId;
  title: string;
  artist: string;
  coverUrl: string;
  /** 同一首歌的不同版本靠它区分 */
  versionId: AudioVersionId;
  versionName: string;
  /** 播放这个版本时显示的歌词 */
  lyricsId: LyricsId | null;
}

/** 卡片上显示的演唱者：优先取演唱相关的 staff，没有时列出所有人 */
export function artistOf(staff: readonly StaffCredit[]): string {
  const singers = staff.filter((credit) => /演唱|歌|vocal/i.test(credit.role));
  return (singers.length > 0 ? singers : staff)
    .flatMap((credit) => credit.names)
    .join('、');
}

/** 列表里的歌曲：播放默认版本 */
export function trackOf(song: SongSummary): Track {
  return {
    songId: song.id,
    title: song.title,
    artist: artistOf(song.staff),
    coverUrl: song.coverUrl,
    versionId: song.defaultVersion.id,
    versionName: song.defaultVersion.name,
    lyricsId: song.defaultVersion.lyricsId,
  };
}

interface PlayerState {
  track: Track | null;
  /** 当前版本绑定的歌词；加载中或没有绑定时为空 */
  lyrics: Lyrics | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  error: string | null;
  isMinimized: boolean;
}

interface PlayerContextValue extends PlayerState {
  /** 已经拿到歌词时可以直接传入，否则按 `track.lyricsId` 加载 */
  play: (track: Track, lyrics?: Lyrics | null) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seek: (time: number) => void;
  toggleMinimize: () => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error('usePlayer must be used within PlayerProvider');
  }
  return ctx;
}

export function usePlayerOptional() {
  return useContext(PlayerContext);
}

interface PlayerProviderProps {
  children: ReactNode;
}

export function PlayerProvider({ children }: PlayerProviderProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const client = useQueryClient();

  // 歌词随歌曲详情一起取，与详情页共用缓存；返回时若已切到别的版本则丢弃
  const loadLyrics = useCallback(
    async (track: Track) => {
      const song = await client
        .fetchQuery({
          queryKey: queryKeys.song(track.songId),
          queryFn: ({ signal }) => fetchSong(track.songId, { signal }),
        })
        .catch(() => null);
      const lyrics = song?.lyrics.find((item) => item.id === track.lyricsId);
      if (!lyrics) return;
      setState((prev) =>
        prev.track?.versionId === track.versionId ? { ...prev, lyrics } : prev,
      );
    },
    [client],
  );

  const [state, setState] = useState<PlayerState>({
    track: null,
    lyrics: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isLoading: false,
    error: null,
    isMinimized: false,
  });

  // 播放新曲目
  const play = useCallback(
    async (track: Track, lyrics?: Lyrics | null) => {
      setState((prev) => ({
        ...prev,
        track,
        lyrics: lyrics ?? null,
        isLoading: true,
        error: null,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        isMinimized: false,
      }));

      if (lyrics === undefined && track.lyricsId) {
        void loadLyrics(track);
      }

      try {
        const audio = audioRef.current;
        if (audio) {
          // 后端 302 到当天有效的签名 URL
          audio.src = audioUrl(track.versionId);
          audio.load();
          await audio.play();
          setState((prev) => ({ ...prev, isPlaying: true, isLoading: false }));
        }
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : '播放失败',
        }));
      }
    },
    [loadLyrics],
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const resume = useCallback(() => {
    audioRef.current
      ?.play()
      .then(() => setState((prev) => ({ ...prev, isPlaying: true })))
      .catch(() => {
        // ignore
      });
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
    }
    setState((prev) => ({
      ...prev,
      track: null,
      lyrics: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
    }));
  }, []);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio && isFinite(time)) {
      audio.currentTime = time;
      setState((prev) => ({ ...prev, currentTime: time }));
    }
  }, []);

  const toggleMinimize = useCallback(() => {
    setState((prev) => ({ ...prev, isMinimized: !prev.isMinimized }));
  }, []);

  // 音频事件处理
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setState((prev) => ({ ...prev, currentTime: audio.currentTime }));
    };

    const handleDurationChange = () => {
      setState((prev) => ({ ...prev, duration: audio.duration || 0 }));
    };

    const handleEnded = () => {
      setState((prev) => ({ ...prev, isPlaying: false, currentTime: 0 }));
    };

    const handleError = () => {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isPlaying: false,
        error: '音频加载失败',
      }));
    };

    const handleCanPlay = () => {
      setState((prev) => ({ ...prev, isLoading: false }));
    };

    const handleWaiting = () => {
      setState((prev) => ({ ...prev, isLoading: true }));
    };

    const handlePlaying = () => {
      setState((prev) => ({ ...prev, isLoading: false, isPlaying: true }));
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
    };
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        ...state,
        play,
        pause,
        resume,
        stop,
        seek,
        toggleMinimize,
        audioRef,
      }}
    >
      {/* 隐藏的 audio 元素 */}
      {/* rslint-disable-next-line jsx-a11y/media-has-caption -- 纯音乐播放，歌词在播放器中单独展示 */}
      <audio ref={audioRef} preload="metadata" />
      {children}
    </PlayerContext.Provider>
  );
}
