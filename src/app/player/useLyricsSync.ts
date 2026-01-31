import { useMemo } from "react";
import type { LyricsDocument, LineBlock } from "@/app/editor/ast/types";

export interface LyricLine {
  index: number;
  startMs: number;
  endMs?: number;
  block: LineBlock;
}

export interface LyricsSyncResult {
  lines: LyricLine[];
  currentIndex: number;
  prevLine: LyricLine | null;
  currentLine: LyricLine | null;
  nextLine: LyricLine | null;
  /** 是否处于预览模式（第一句歌词开始前） */
  isPreview: boolean;
}

/**
 * 从 LyricsDocument 中提取有时间轴的歌词行
 * 只提取有 time 属性的 line block，没有时间的歌词不参与播放器同步
 */
function extractLines(doc: LyricsDocument | null | undefined): LyricLine[] {
  if (!doc?.blocks) return [];
  
  const lines: LyricLine[] = [];
  let index = 0;
  
  for (const block of doc.blocks) {
    // 只处理有时间轴的 line block
    if (block.type === "line" && block.time) {
      lines.push({
        index,
        startMs: block.time.startMs,
        endMs: block.time.endMs,
        block,
      });
      index++;
    }
  }
  
  return lines;
}

/**
 * 二分查找当前应该显示的歌词行索引
 * @param lines 歌词行数组（已按 startMs 排序）
 * @param currentTimeMs 当前播放时间（毫秒）
 * @returns 当前行索引，如果还没开始则返回 -1
 */
function findCurrentLineIndex(lines: LyricLine[], currentTimeMs: number): number {
  if (lines.length === 0) return -1;
  
  // 还没到第一行
  if (currentTimeMs < lines[0].startMs) return -1;
  
  // 二分查找
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
 * 歌词同步 Hook
 * @param doc 歌词文档
 * @param currentTime 当前播放时间（秒）
 */
export function useLyricsSync(
  doc: LyricsDocument | null | undefined,
  currentTime: number
): LyricsSyncResult {
  // 提取歌词行（memo 化）
  const lines = useMemo(() => extractLines(doc), [doc]);
  
  // 当前时间转毫秒
  const currentTimeMs = currentTime * 1000;
  
  // 查找当前行索引
  const currentIndex = useMemo(
    () => findCurrentLineIndex(lines, currentTimeMs),
    [lines, currentTimeMs]
  );
  
  // 获取前一行、当前行、下一行
  // 特殊情况：在第一句歌词开始前，显示前三行作为预览
  let prevLine: LyricLine | null = null;
  let currentLine: LyricLine | null = null;
  let nextLine: LyricLine | null = null;
  let isPreview = false;
  
  if (currentIndex === -1 && lines.length > 0) {
    // 还没开始播放歌词，显示前三行作为预览（不高亮）
    isPreview = true;
    prevLine = lines[0] || null;
    currentLine = lines[1] || null;
    nextLine = lines[2] || null;
  } else if (currentIndex >= 0) {
    // 正常播放中
    prevLine = currentIndex > 0 ? lines[currentIndex - 1] : null;
    currentLine = lines[currentIndex] || null;
    nextLine = currentIndex < lines.length - 1 ? lines[currentIndex + 1] : null;
  }
  
  return {
    lines,
    currentIndex,
    prevLine,
    currentLine,
    nextLine,
    isPreview,
  };
}
