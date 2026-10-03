import { describe, expect, test } from 'rstack/test';
import { buildPlainText } from '../src/app/editor/ast/plainText';
import { toLines } from '../src/app/editor/ast/toLines';
import type { Block } from '../src/app/editor/ast/types';

describe('toLines', () => {
  test('restores tokens, ruby and timing from the AST', () => {
    const lines = toLines('doc1', {
      blocks: [
        {
          type: 'line',
          time: { startMs: 10500, endMs: 14200 },
          children: [
            { type: 'ruby', base: '君', ruby: 'きみ' },
            { type: 'text', text: 'の声が' },
          ],
        },
        { type: 'p', children: [{ type: 'text', text: '注释段落' }] },
        {
          type: 'line',
          time: { startMs: 16800 },
          children: [{ type: 'text', text: '世界を変える' }],
        },
      ],
    });
    expect(lines).toEqual([
      {
        id: 'line_doc1_0',
        startMs: 10500,
        endMs: 14200,
        text: '君/の声が',
        rubyByIndex: { 0: 'きみ' },
      },
      {
        id: 'line_doc1_1',
        startMs: 16800,
        endMs: undefined,
        text: '世界を変える',
        rubyByIndex: undefined,
      },
    ]);
  });

  test('ruby index counts tokens, not characters', () => {
    const [line] = toLines('d', {
      blocks: [
        {
          type: 'line',
          children: [
            { type: 'text', text: '長い' },
            { type: 'ruby', base: '夢', ruby: 'ゆめ' },
          ],
        },
      ],
    });
    expect(line.text).toBe('長い/夢');
    expect(line.rubyByIndex).toEqual({ 1: 'ゆめ' });
    expect(line.startMs).toBe(0);
  });
});

describe('buildPlainText', () => {
  test('uses ruby base, collapses whitespace and skips empty lines', () => {
    const blocks: Block[] = [
      {
        type: 'line',
        children: [
          { type: 'ruby', base: '君', ruby: 'きみ' },
          { type: 'text', text: 'の  声' },
        ],
      },
      { type: 'line', children: [{ type: 'text', text: '   ' }] },
      { type: 'p', children: [{ type: 'text', text: '段落不计入' }] },
    ];
    expect(buildPlainText(blocks)).toBe('君の 声');
  });
});
