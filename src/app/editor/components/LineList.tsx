import { Box, Button, Chip, Stack, Typography } from "@mui/material";
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
        {lines.map((line) => (
          <Box
            key={line.id}
            onClick={() => onSelect(line.id)}
            sx={{
              border: "1px solid",
              borderColor:
                line.id === selectedId ? "primary.main" : "rgba(31, 26, 22, 0.12)",
              p: 1.5,
              cursor: "pointer",
            }}
          >
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip size="small" label={`${line.startMs}ms`} />
                {line.endMs !== undefined ? (
                  <Chip size="small" variant="outlined" label={`${line.endMs}ms`} />
                ) : null}
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {line.text || "(空行)"}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" onClick={() => onMove(line.id, "up")}>
                  上移
                </Button>
                <Button size="small" onClick={() => onMove(line.id, "down")}>
                  下移
                </Button>
                <Button size="small" color="error" onClick={() => onRemove(line.id)}>
                  删除
                </Button>
              </Stack>
            </Stack>
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}
