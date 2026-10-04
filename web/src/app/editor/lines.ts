import {
  spansFromTokens,
  tokensFromSpans,
  type LyricLine,
} from '@koiro/shared';
import type { LineDraft } from './state/useLyricsEditor';

/** 编辑中的行 → 接口的歌词行 */
export function toLyricLines(drafts: readonly LineDraft[]): LyricLine[] {
  return drafts.map((draft) => ({
    startMs: draft.startMs,
    endMs: draft.endMs ?? null,
    spans: spansFromTokens({
      text: draft.text,
      rubyByIndex: draft.rubyByIndex ?? {},
    }),
  }));
}

/** 接口的歌词行 → 编辑中的行；`idPrefix` 让不同歌词的行 id 互不相同 */
export function toLineDrafts(
  lines: readonly LyricLine[],
  idPrefix: string,
): LineDraft[] {
  return lines.map((line, index) => {
    const { text, rubyByIndex } = tokensFromSpans(line.spans);
    return {
      id: `${idPrefix}_${String(index)}`,
      startMs: line.startMs,
      ...(line.endMs === null ? {} : { endMs: line.endMs }),
      text,
      ...(Object.keys(rubyByIndex).length > 0 ? { rubyByIndex } : {}),
    };
  });
}

/** 编辑时提前提示服务端会拒绝的情况：时间顺序与时间范围 */
export function lineErrors(lines: readonly LyricLine[]): string[] {
  const errors: string[] = [];
  lines.forEach((line, index) => {
    const number = index + 1;
    if (index > 0 && line.startMs < lines[index - 1].startMs) {
      errors.push(`第 ${String(number)} 行的开始时间早于上一行`);
    }
    if (line.endMs !== null && line.endMs < line.startMs) {
      errors.push(`第 ${String(number)} 行的结束时间早于开始时间`);
    }
  });
  return errors;
}
