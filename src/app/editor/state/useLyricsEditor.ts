import { useMemo, useState } from "react";
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

export function useLyricsEditor() {
  const [lines, setLines] = useState<LineDraft[]>(initialLines);
  const [selectedId, setSelectedId] = useState<string>(initialLines[0].id);

  const selectedLine = useMemo(
    () => lines.find((line) => line.id === selectedId) ?? lines[0],
    [lines, selectedId]
  );

  const blocks = useMemo<Block[]>(() => {
    return lines.map((line) => ({
      type: "line",
      time: {
        startMs: line.startMs,
        endMs: line.endMs,
      },
      children: textToInlines(line.text, line.rubyByIndex),
    }));
  }, [lines]);

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
    setLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, ...updates } : line))
    );
  };

  const addLine = () => {
    setLines((prev) => {
      const last = prev[prev.length - 1];
      const nextStart = last ? last.startMs + 2000 : 0;
      const nextId = `line_${prev.length + 1}`;
      return [
        ...prev,
        { id: nextId, startMs: nextStart, text: "" },
      ];
    });
  };

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((line) => line.id !== id));
    setSelectedId((prev) => (prev === id && lines.length > 1 ? lines[0].id : prev));
  };

  const moveLine = (id: string, direction: "up" | "down") => {
    setLines((prev) => {
      const index = prev.findIndex((line) => line.id === id);
      if (index < 0) return prev;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
  };

  return {
    lines,
    selectedLine,
    selectedId,
    setSelectedId,
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
