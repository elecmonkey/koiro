import type { Block } from "./types";

type ValidationResult = {
  ok: boolean;
  errors: string[];
};

export function validateBlocks(blocks: Block[]): ValidationResult {
  const errors: string[] = [];
  let lastStart = -1;

  blocks.forEach((block, index) => {
    if (block.type !== "line") {
      return;
    }
    if (block.time.startMs < 0) {
      errors.push(`第 ${index + 1} 行 startMs 不能为负数`);
    }
    if (block.time.endMs !== undefined && block.time.endMs < block.time.startMs) {
      errors.push(`第 ${index + 1} 行 endMs 不能早于 startMs`);
    }
    if (block.time.startMs <= lastStart) {
      errors.push(`第 ${index + 1} 行 startMs 必须严格递增`);
    }
    lastStart = block.time.startMs;
  });

  return { ok: errors.length === 0, errors };
}
