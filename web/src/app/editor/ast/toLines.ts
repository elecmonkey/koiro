import type { Language } from '@koiro/shared';
import type { LineDraft } from '../state/useLyricsEditor';

export type LyricsContent = {
  meta?: { languages?: Language[] };
  blocks?: {
    type: string;
    time?: { startMs?: number; endMs?: number };
    children?: { type: string; text?: string; base?: string; ruby?: string }[];
  }[];
};

/** 把歌词 AST 还原成编辑器的行：正文用 "/" 连接以保留分词，ruby 按分词序号记录 */
export function toLines(lyricsId: string, content: LyricsContent): LineDraft[] {
  return (content.blocks ?? [])
    .filter((block) => block.type === 'line')
    .map((block, index) => {
      const textParts: string[] = [];
      const rubyByIndex: Record<number, string> = {};
      for (const child of block.children ?? []) {
        if (child.type === 'text' && child.text) {
          textParts.push(child.text);
        } else if (child.type === 'ruby' && child.base) {
          if (child.ruby) rubyByIndex[textParts.length] = child.ruby;
          textParts.push(child.base);
        }
      }
      return {
        id: `line_${lyricsId}_${index}`,
        startMs: block.time?.startMs ?? 0,
        endMs: block.time?.endMs,
        text: textParts.join('/'),
        rubyByIndex:
          Object.keys(rubyByIndex).length > 0 ? rubyByIndex : undefined,
      };
    });
}
