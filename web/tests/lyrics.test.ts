import type { LyricLine } from '@koiro/shared';
import { describe, expect, test } from 'rstack/test';
import {
  lineErrors,
  toLineDrafts,
  toLyricLines,
} from '../src/app/editor/lines';

const lines: LyricLine[] = [
  {
    startMs: 10500,
    endMs: 14200,
    spans: [
      { type: 'ruby', base: '君', ruby: 'きみ' },
      { type: 'text', text: 'の声が' },
    ],
  },
  { startMs: 16800, endMs: null, spans: [] },
];

describe('editor lines', () => {
  test('convert to editable drafts and back without loss', () => {
    const drafts = toLineDrafts(lines, 'doc1');
    expect(drafts).toEqual([
      {
        id: 'doc1_0',
        startMs: 10500,
        endMs: 14200,
        text: '君/の声が',
        rubyByIndex: { 0: 'きみ' },
      },
      { id: 'doc1_1', startMs: 16800, text: '' },
    ]);
    expect(toLyricLines(drafts)).toEqual(lines);
  });

  test('ruby indexes count tokens, and empty tokens are dropped', () => {
    expect(
      toLyricLines([
        { id: 'a', startMs: 0, text: '長い//夢', rubyByIndex: { 1: 'ゆめ' } },
      ])[0].spans,
    ).toEqual([
      { type: 'text', text: '長い' },
      { type: 'ruby', base: '夢', ruby: 'ゆめ' },
    ]);
  });

  test('flag lines the server would reject', () => {
    expect(lineErrors(lines)).toEqual([]);
    expect(
      lineErrors([
        { startMs: 5, endMs: 1, spans: [] },
        { startMs: 0, endMs: null, spans: [] },
      ]),
    ).toEqual(['第 1 行的结束时间早于开始时间', '第 2 行的开始时间早于上一行']);
  });
});
