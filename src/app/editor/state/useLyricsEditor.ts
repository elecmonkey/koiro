import { useEffect, useMemo, useReducer, useRef } from "react";
import type { Block, Inline, LyricsDocument } from "../ast/types";
import { buildPlainText } from "../ast/plainText";

export type LineDraft = {
  id: string;
  startMs: number;
  endMs?: number;
  text: string;
  rubyByIndex?: Record<number, string>;
};

const initialLines: LineDraft[] = [
  { id: "line_1", startMs: 10500, endMs: 14200, text: "君/の声が" },
  { id: "line_2", startMs: 16800, text: "世界を変える" },
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
  | { type: "select"; id: string }
  | { type: "update"; id: string; updates: Partial<LineDraft> }
  | { type: "add" }
  | { type: "remove"; id: string }
  | { type: "move"; id: string; direction: "up" | "down" };

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "select":
      return { ...state, selectedId: action.id };
    case "update": {
      const next = state.lines.map((line) =>
        line.id === action.id ? { ...line, ...action.updates } : line
      );
      return { ...state, lines: next };
    }
    case "add": {
      const last = state.lines[state.lines.length - 1];
      const nextStart = last ? last.startMs + 2000 : 0;
      const nextId = `line_${state.lines.length + 1}`;
      const next = [...state.lines, { id: nextId, startMs: nextStart, text: "" }];
      const selectedId = state.selectedId || next[0]?.id || "";
      return { lines: next, selectedId };
    }
    case "remove": {
      const next = state.lines.filter((line) => line.id !== action.id);
      const selectedId =
        state.selectedId === action.id ? next[0]?.id ?? "" : state.selectedId;
      return { lines: next, selectedId };
    }
    case "move": {
      const index = state.lines.findIndex((line) => line.id === action.id);
      if (index < 0) return state;
      const targetIndex = action.direction === "up" ? index - 1 : index + 1;
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
    selectedId: seed[0]?.id ?? "",
  });
  const onChangeRef = useRef(options.onChange);

  useEffect(() => {
    onChangeRef.current = options.onChange;
  }, [options.onChange]);

  useEffect(() => {
    onChangeRef.current?.(state.lines);
  }, [state.lines]);

  const selectedLine = useMemo(
    () => state.lines.find((line) => line.id === state.selectedId) ?? state.lines[0],
    [state.lines, state.selectedId]
  );

  const blocks = useMemo<Block[]>(() => {
    return state.lines.map((line) => ({
      type: "line",
      time: {
        startMs: line.startMs,
        endMs: line.endMs,
      },
      children: textToInlines(line.text, line.rubyByIndex),
    }));
  }, [state.lines]);

  const doc = useMemo<LyricsDocument>(() => {
    return {
      type: "doc",
      meta: {
        languages: ["ja", "zh"],
      },
      blocks,
    };
  }, [blocks]);

  const plainText = useMemo(() => buildPlainText(blocks), [blocks]);

  const updateLine = (id: string, updates: Partial<LineDraft>) => {
    dispatch({ type: "update", id, updates });
  };

  const addLine = () => {
    dispatch({ type: "add" });
  };

  const removeLine = (id: string) => {
    dispatch({ type: "remove", id });
  };

  const moveLine = (id: string, direction: "up" | "down") => {
    dispatch({ type: "move", id, direction });
  };

  return {
    lines: state.lines,
    selectedLine,
    selectedId: state.selectedId,
    setSelectedId: (id: string) => dispatch({ type: "select", id }),
    updateLine,
    addLine,
    removeLine,
    moveLine,
    doc,
    plainText,
  };
}

function textToInlines(text: string, rubyByIndex?: Record<number, string>): Inline[] {
  if (!text) {
    return [{ type: "text", text: "" }];
  }

  const parts = text.split(/\n/);
  const inlines: Inline[] = [];
  parts.forEach((part, lineIndex) => {
    inlines.push(...buildInlinesFromText(part, rubyByIndex));
    if (lineIndex < parts.length - 1) {
      inlines.push({ type: "br" });
    }
  });
  return inlines;
}

function buildInlinesFromText(
  text: string,
  rubyByIndex: Record<number, string> | undefined
): Inline[] {
  if (!text) {
    return [{ type: "text", text: "" }];
  }

  const segments = text.split(/(\/)/);
  let tokenIndex = 0;
  const inlines: Inline[] = [];

  segments.forEach((segment) => {
    if (!segment) {
      return;
    }
    if (segment === "/") {
      return;
    }
    const ruby = rubyByIndex?.[tokenIndex];
    if (ruby) {
      inlines.push({ type: "ruby", base: segment, ruby });
    } else {
      inlines.push({ type: "text", text: segment });
    }
    tokenIndex += 1;
  });

  return inlines;
}
