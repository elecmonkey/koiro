"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

export interface Track {
  id: string;
  title: string;
  artist?: string;
  coverUrl?: string | null;
  audioObjectId: string;
}

interface PlayerState {
  track: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  error: string | null;
  isMinimized: boolean;
}

interface PlayerContextValue extends PlayerState {
  play: (track: Track) => Promise<void>;
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
    throw new Error("usePlayer must be used within PlayerProvider");
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
  const [state, setState] = useState<PlayerState>({
    track: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isLoading: false,
    error: null,
    isMinimized: false,
  });

  // 获取音频的 presigned URL
  const fetchAudioUrl = useCallback(async (objectId: string): Promise<string> => {
    const res = await fetch("/api/object-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objectId }),
    });
    if (!res.ok) {
      throw new Error("Failed to get audio URL");
    }
    const data = await res.json();
    return data.url;
  }, []);

  // 播放新曲目
  const play = useCallback(
    async (track: Track) => {
      setState((prev) => ({
        ...prev,
        track,
        isLoading: true,
        error: null,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        isMinimized: false,
      }));

      try {
        const url = await fetchAudioUrl(track.audioObjectId);
        const audio = audioRef.current;
        if (audio) {
          audio.src = url;
          audio.load();
          await audio.play();
          setState((prev) => ({ ...prev, isPlaying: true, isLoading: false }));
        }
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : "播放失败",
        }));
      }
    },
    [fetchAudioUrl]
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const resume = useCallback(async () => {
    try {
      await audioRef.current?.play();
      setState((prev) => ({ ...prev, isPlaying: true }));
    } catch {
      // ignore
    }
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.src = "";
    }
    setState((prev) => ({
      ...prev,
      track: null,
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
        error: "音频加载失败",
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

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("playing", handlePlaying);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("playing", handlePlaying);
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
      <audio ref={audioRef} preload="metadata" />
      {children}
    </PlayerContext.Provider>
  );
}
