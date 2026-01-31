import type { Block, Inline } from "./types";

export function buildPlainText(blocks: Block[]) {
  const lines: string[] = [];

  for (const block of blocks) {
    if (block.type !== "line") {
      continue;
    }
    const parts: string[] = [];
    collectInlineText(block.children, parts);
    const lineText = parts.join("").replace(/\s+/g, " ").trim();
    lines.push(lineText);
  }

  return lines.filter((line) => line.length > 0).join("\n");
}

function collectInlineText(inlines: Inline[], parts: string[]) {
  for (const inline of inlines) {
    switch (inline.type) {
      case "text":
        if (inline.text.length > 0) {
          parts.push(inline.text);
        }
        break;
      case "ruby":
        if (inline.base.length > 0) {
          parts.push(inline.base);
        }
        break;
      case "em":
      case "strong":
        collectInlineText(inline.children, parts);
        break;
      case "annotation":
        if (inline.text.length > 0) {
          parts.push(inline.text);
        }
        break;
      case "br":
      default:
        break;
    }
  }
}
