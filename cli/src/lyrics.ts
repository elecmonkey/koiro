import type { Json, JsonObject } from './json';

/**
 * 歌词的可编辑形式，与网站编辑器、后端接口一致：
 * text 用 "/" 分词，rubyByIndex 按分词序号（从 0 开始）标注读音
 */
export interface Line {
  startMs: number;
  endMs?: number;
  text: string;
  rubyByIndex?: Record<string, string>;
}

/** 便于阅读的形式：注音写成 基字(读音) */
export interface ReadableLine {
  startMs: number;
  endMs?: number;
  text: string;
}

interface Inline {
  type?: Json;
  text?: Json;
  base?: Json;
  ruby?: Json;
}

function lineBlocks(content: Json | undefined) {
  const blocks =
    content && typeof content === 'object' && !Array.isArray(content)
      ? content.blocks
      : undefined;
  if (!Array.isArray(blocks)) return [];
  return blocks.filter(
    (block): block is JsonObject =>
      block !== null &&
      typeof block === 'object' &&
      !Array.isArray(block) &&
      block.type === 'line',
  );
}

function times(block: JsonObject) {
  const time =
    block.time && typeof block.time === 'object' && !Array.isArray(block.time)
      ? block.time
      : {};
  const startMs = typeof time.startMs === 'number' ? time.startMs : 0;
  const endMs = typeof time.endMs === 'number' ? time.endMs : undefined;
  return endMs === undefined ? { startMs } : { startMs, endMs };
}

function inlines(block: JsonObject): Inline[] {
  return Array.isArray(block.children)
    ? block.children.filter(
        (child): child is JsonObject =>
          child !== null && typeof child === 'object' && !Array.isArray(child),
      )
    : [];
}

/** 歌词 AST → 可编辑的行（网站编辑页用的同一套规则） */
export function toLines(content: Json | undefined): Line[] {
  return lineBlocks(content).map((block) => {
    const parts: string[] = [];
    const rubyByIndex: Record<string, string> = {};
    for (const child of inlines(block)) {
      if (
        child.type === 'text' &&
        typeof child.text === 'string' &&
        child.text
      ) {
        parts.push(child.text);
      } else if (
        child.type === 'ruby' &&
        typeof child.base === 'string' &&
        child.base
      ) {
        if (typeof child.ruby === 'string' && child.ruby)
          rubyByIndex[String(parts.length)] = child.ruby;
        parts.push(child.base);
      }
    }
    return {
      ...times(block),
      text: parts.join('/'),
      ...(Object.keys(rubyByIndex).length > 0 ? { rubyByIndex } : {}),
    };
  });
}

/** 歌词 AST → 便于阅读的行 */
export function toReadableLines(content: Json | undefined): ReadableLine[] {
  return lineBlocks(content).map((block) => ({
    ...times(block),
    text: inlines(block)
      .map((child) => {
        if (child.type === 'text' && typeof child.text === 'string')
          return child.text;
        if (child.type === 'ruby' && typeof child.base === 'string') {
          return typeof child.ruby === 'string' && child.ruby
            ? `${child.base}(${child.ruby})`
            : child.base;
        }
        return '';
      })
      .join(''),
  }));
}

/** LRC → 可编辑的行；一行有多个时间标签时展开为多行，没有时间标签的行记为 0 */
export function parseLrc(content: string): Line[] {
  const result: Line[] = [];
  const timeTag = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
  for (const raw of content.split(/\r?\n/)) {
    const text = raw.replace(timeTag, '').trim();
    // 元数据行，如 [ar:...]、[ti:...]
    if (/^\[[a-z]+:.*\]$/i.test(raw.trim())) continue;
    let hasTime = false;
    for (const match of raw.matchAll(timeTag)) {
      hasTime = true;
      const fraction = match[3] ?? '';
      const ms = fraction ? Number(fraction.padEnd(3, '0')) : 0;
      result.push({
        startMs: Number(match[1]) * 60_000 + Number(match[2]) * 1000 + ms,
        text,
      });
    }
    if (!hasTime && text) result.push({ startMs: 0, text });
  }
  return result.sort((a, b) => a.startMs - b.startMs);
}
