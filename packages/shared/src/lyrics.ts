import type { LyricLine, Span } from './generated/api';

/**
 * 歌词一行的编辑形式：正文用 "/" 分词，`rubyByIndex` 按分词序号（从 0 开始）标注读音。
 * 如 `{ text: "君/の声", rubyByIndex: { 0: "きみ" } }` 即「君(きみ)の声」。
 */
export interface TokenizedText {
  text: string;
  rubyByIndex: Record<number, string>;
}

/** 编辑形式 → 接口的文字片段；空的分词被丢弃 */
export function spansFromTokens({ text, rubyByIndex }: TokenizedText): Span[] {
  return text
    .split('/')
    .filter((token) => token !== '')
    .map((token, index) => {
      const ruby = rubyByIndex[index];
      return ruby
        ? { type: 'ruby', base: token, ruby }
        : { type: 'text', text: token };
    });
}

/** 接口的文字片段 → 编辑形式 */
export function tokensFromSpans(spans: readonly Span[]): TokenizedText {
  const rubyByIndex: Record<number, string> = {};
  const tokens = spans.map((span, index) => {
    if (span.type === 'text') return span.text;
    rubyByIndex[index] = span.ruby;
    return span.base;
  });
  return { text: tokens.join('/'), rubyByIndex };
}

/** 纯文字：注音只取基字 */
export function spansText(spans: readonly Span[]): string {
  return spans
    .map((span) => (span.type === 'text' ? span.text : span.base))
    .join('');
}

/** 便于阅读的文字：注音写成 `基字(读音)` */
export function readableText(spans: readonly Span[]): string {
  return spans
    .map((span) =>
      span.type === 'text' ? span.text : `${span.base}(${span.ruby})`,
    )
    .join('');
}

const TIME_TAG = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
const METADATA = /^\[[a-z]+:.*\]$/i;

/**
 * LRC → 歌词行，按开始时间排列。
 * 忽略 `[ti:]` 等元数据行；一行有多个时间标签时展开为多行；没有时间标签的文字行记为 0 毫秒。
 */
export function parseLrc(content: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const raw of content.split(/\r?\n/)) {
    if (METADATA.test(raw.trim())) continue;
    const text = raw.replace(TIME_TAG, '').trim();
    const spans: Span[] = text ? [{ type: 'text', text }] : [];
    const starts = [...raw.matchAll(TIME_TAG)].map(
      ([, minutes, seconds, fraction = '']) =>
        Number(minutes) * 60_000 +
        Number(seconds) * 1000 +
        (fraction ? Number(fraction.padEnd(3, '0')) : 0),
    );
    if (starts.length === 0 && text) starts.push(0);
    for (const startMs of starts) lines.push({ startMs, endMs: null, spans });
  }
  return lines.sort((a, b) => a.startMs - b.startMs);
}
