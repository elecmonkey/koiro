import { useEffect, useMemo, useReducer, useRef } from 'react';
import { toLyricLines } from './lines';

/** 编辑中的一行：`text` 用 "/" 分词，`rubyByIndex` 按分词序号标注读音 */
export type LineDraft = {
  id: string;
  startMs: number;
  endMs?: number;
  text: string;
  rubyByIndex?: Record<number, string>;
};

const initialLines: LineDraft[] = [
  { id: 'line_1', startMs: 10500, endMs: 14200, text: '君/の声が' },
  { id: 'line_2', startMs: 16800, text: '世界を変える' },
];

type UseLyricsEditorOptions = {
  initial?: LineDraft[];
  onChange?: (lines: LineDraft[]) => void;
};

type EditorState = {
  lines: LineDraft[];
  selectedId: string;
};

type EditorAction =
  | { type: 'select'; id: string }
  | { type: 'update'; id: string; updates: Partial<LineDraft> }
  | { type: 'add' }
  | { type: 'remove'; id: string }
  | { type: 'move'; id: string; direction: 'up' | 'down' };

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'select':
      return { ...state, selectedId: action.id };
    case 'update': {
      const next = state.lines.map((line) =>
        line.id === action.id ? { ...line, ...action.updates } : line,
      );
      return { ...state, lines: next };
    }
    case 'add': {
      const last = state.lines[state.lines.length - 1];
      const nextStart = last ? last.startMs + 2000 : 0;
      const nextId = `line_${state.lines.length + 1}`;
      const next = [
        ...state.lines,
        { id: nextId, startMs: nextStart, text: '' },
      ];
      const selectedId = state.selectedId || next[0]?.id || '';
      return { lines: next, selectedId };
    }
    case 'remove': {
      const next = state.lines.filter((line) => line.id !== action.id);
      const selectedId =
        state.selectedId === action.id ? (next[0]?.id ?? '') : state.selectedId;
      return { lines: next, selectedId };
    }
    case 'move': {
      const index = state.lines.findIndex((line) => line.id === action.id);
      if (index < 0) return state;
      const targetIndex = action.direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= state.lines.length) return state;
      const next = [...state.lines];
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return { ...state, lines: next };
    }
    default:
      return state;
  }
}

export function useLyricsEditor(options: UseLyricsEditorOptions = {}) {
  const seed = options.initial ?? initialLines;
  const [state, dispatch] = useReducer(editorReducer, {
    lines: seed,
    selectedId: seed[0]?.id ?? '',
  });
  const onChangeRef = useRef(options.onChange);

  useEffect(() => {
    onChangeRef.current = options.onChange;
  }, [options.onChange]);

  useEffect(() => {
    onChangeRef.current?.(state.lines);
  }, [state.lines]);

  const selectedLine = useMemo(
    () =>
      state.lines.find((line) => line.id === state.selectedId) ??
      state.lines[0],
    [state.lines, state.selectedId],
  );

  // 提交后的样子，用于预览和校验
  const preview = useMemo(() => toLyricLines(state.lines), [state.lines]);

  const updateLine = (id: string, updates: Partial<LineDraft>) => {
    dispatch({ type: 'update', id, updates });
  };

  const addLine = () => {
    dispatch({ type: 'add' });
  };

  const removeLine = (id: string) => {
    dispatch({ type: 'remove', id });
  };

  const moveLine = (id: string, direction: 'up' | 'down') => {
    dispatch({ type: 'move', id, direction });
  };

  return {
    lines: state.lines,
    selectedLine,
    selectedId: state.selectedId,
    setSelectedId: (id: string) => dispatch({ type: 'select', id }),
    updateLine,
    addLine,
    removeLine,
    moveLine,
    preview,
  };
}
