import { expect, test } from 'rstack/test';
import {
  parseLrc,
  readableText,
  spansFromTokens,
  spansText,
  tokensFromSpans,
} from './lyrics';

test('editing tokens and spans convert both ways', () => {
  const spans = spansFromTokens({
    text: '君/の/声//が',
    rubyByIndex: { 0: 'きみ', 2: 'こえ' },
  });
  expect(spans).toEqual([
    { type: 'ruby', base: '君', ruby: 'きみ' },
    { type: 'text', text: 'の' },
    { type: 'ruby', base: '声', ruby: 'こえ' },
    { type: 'text', text: 'が' },
  ]);
  expect(tokensFromSpans(spans)).toEqual({
    text: '君/の/声/が',
    rubyByIndex: { 0: 'きみ', 2: 'こえ' },
  });
  expect(spansFromTokens({ text: '', rubyByIndex: {} })).toEqual([]);
  expect(spansText(spans)).toBe('君の声が');
  expect(readableText(spans)).toBe('君(きみ)の声(こえ)が');
});

test('LRC becomes sorted lines', () => {
  expect(
    parseLrc(
      '[ti:Title]\n[00:01.2][00:05.00]la la\n[00:03.456]next\nuntimed\n[00:06.00]',
    ),
  ).toEqual([
    { startMs: 0, endMs: null, spans: [{ type: 'text', text: 'untimed' }] },
    { startMs: 1200, endMs: null, spans: [{ type: 'text', text: 'la la' }] },
    { startMs: 3456, endMs: null, spans: [{ type: 'text', text: 'next' }] },
    { startMs: 5000, endMs: null, spans: [{ type: 'text', text: 'la la' }] },
    { startMs: 6000, endMs: null, spans: [] },
  ]);
});
