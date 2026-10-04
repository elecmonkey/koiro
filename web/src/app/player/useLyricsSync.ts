import type { LyricLine } from '@koiro/shared';
import { useMemo } from 'react';

export interface LyricsSyncResult {
  currentIndex: number;
  prevLine: LyricLine | null;
  currentLine: LyricLine | null;
  nextLine: LyricLine | null;
  /** 是否处于预览模式（第一句歌词开始前） */
  isPreview: boolean;
}

/**
 * 二分查找当前应该显示的歌词行
 * @param lines 歌词行（按 startMs 排列，接口保证）
 * @returns 当前行索引；还没到第一行时为 -1
 */
function findCurrentLineIndex(
  lines: readonly LyricLine[],
  currentTimeMs: number,
): number {
  if (lines.length === 0 || currentTimeMs < lines[0].startMs) return -1;
  let left = 0;
  let right = lines.length - 1;
  while (left < right) {
    const mid = Math.floor((left + right + 1) / 2);
    if (lines[mid].startMs <= currentTimeMs) {
      left = mid;
    } else {
      right = mid - 1;
    }
  }
  return left;
}

/**
 * 歌词同步
 * @param lines 歌词行
 * @param currentTime 当前播放时间（秒）
 */
/** 越界时为 null */
function lineAt(lines: readonly LyricLine[], index: number): LyricLine | null {
  return index >= 0 && index < lines.length ? lines[index] : null;
}

export function useLyricsSync(
  lines: readonly LyricLine[],
  currentTime: number,
): LyricsSyncResult {
  const currentIndex = useMemo(
    () => findCurrentLineIndex(lines, currentTime * 1000),
    [lines, currentTime],
  );

  // 第一句歌词开始前，显示前三行作为预览（不高亮）
  if (currentIndex === -1) {
    return {
      currentIndex,
      prevLine: lineAt(lines, 0),
      currentLine: lineAt(lines, 1),
      nextLine: lineAt(lines, 2),
      isPreview: lines.length > 0,
    };
  }
  return {
    currentIndex,
    prevLine: lineAt(lines, currentIndex - 1),
    currentLine: lines[currentIndex],
    nextLine: lineAt(lines, currentIndex + 1),
    isPreview: false,
  };
}
