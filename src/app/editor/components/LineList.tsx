import { Box, Button, ButtonBase, ButtonGroup, Chip, Stack, Typography } from "@mui/material";
import type { LineDraft } from "../state/useLyricsEditor";

type LineListProps = {
  lines: LineDraft[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
};

export default function LineList({
  lines,
  selectedId,
  onSelect,
  onAdd,
  onRemove,
  onMove,
}: LineListProps) {
  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="subtitle1">歌词行</Typography>
        <Button size="small" variant="outlined" onClick={onAdd}>
          新增行
        </Button>
      </Stack>
      <Stack spacing={1.5}>
        {lines.map((line, index) => (
          <Box
            key={line.id}
            sx={{
              position: "relative",
              border: "1px solid",
              borderColor:
                line.id === selectedId ? "primary.main" : "rgba(31, 26, 22, 0.12)",
            }}
          >
            <ButtonBase
              onClick={() => onSelect(line.id)}
              sx={{
                p: 1.5,
                pr: 14,
                width: "100%",
                display: "block",
                textAlign: "left",
              }}
            >
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip size="small" label={String(index + 1).padStart(2, "0")} />
                  <Chip size="small" label={formatTime(line.startMs)} />
                  {line.endMs !== undefined ? (
                    <Chip size="small" variant="outlined" label={formatTime(line.endMs)} />
                  ) : null}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {line.text || "(空行)"}
                </Typography>
              </Stack>
            </ButtonBase>

            {/* 按钮组 - 使用绝对定位避免嵌套 */}
            <ButtonGroup
              variant="outlined"
              size="small"
              sx={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                height: 24,
                "& .MuiButtonGroup-grouped": {
                  minHeight: 24,
                  height: 24,
                  minWidth: 28,
                  px: 0,
                  lineHeight: 1,
                  borderColor: "rgba(31, 26, 22, 0.35) !important",
                },
                "& svg": { display: "block" },
              }}
            >
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(line.id, "up");
                }}
                disabled={index === 0}
                aria-label="上移"
                sx={{ color: "text.secondary" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6l-6 6z"
                    fill="currentColor"
                  />
                </svg>
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(line.id, "down");
                }}
                disabled={index === lines.length - 1}
                aria-label="下移"
                sx={{ color: "text.secondary" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6l-6-6z" fill="currentColor" />
                </svg>
              </Button>
              <Button
                color="error"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(line.id);
                }}
                disabled={lines.length === 1}
                aria-label="删除"
                sx={{ color: "error.main" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z"
                    fill="currentColor"
                  />
                </svg>
              </Button>
            </ButtonGroup>
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}

function formatTime(ms: number) {
  return `${(ms / 1000).toFixed(3)}s`;
}
