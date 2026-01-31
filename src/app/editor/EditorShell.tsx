"use client";

import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import { useLyricsEditor, LineDraft } from "./state/useLyricsEditor";
import LineList from "./components/LineList";
import LineEditor from "./components/LineEditor";
import PreviewPanel from "./components/PreviewPanel";
import { validateBlocks } from "./ast/validate";

type EditorShellProps = {
  initialLines?: LineDraft[];
  onLinesChange?: (lines: LineDraft[]) => void;
};

export default function EditorShell({ initialLines, onLinesChange }: EditorShellProps) {
  const {
    lines,
    selectedId,
    selectedLine,
    setSelectedId,
    updateLine,
    addLine,
    removeLine,
    moveLine,
    doc,
    plainText,
  } = useLyricsEditor({ initial: initialLines, onChange: onLinesChange });

  const validation = validateBlocks(doc.blocks);

  return (
    <Stack spacing={3} sx={{ py: 4 }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "1fr 1.6fr 1.2fr",
          },
          gap: 2,
          alignItems: "start",
        }}
      >
        <Box>
          <Card variant="outlined">
            <CardContent>
              <LineList
                lines={lines}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onAdd={addLine}
                onRemove={removeLine}
                onMove={moveLine}
              />
            </CardContent>
          </Card>
        </Box>
        <Box>
          <Card variant="outlined">
            <CardContent>
              <LineEditor line={selectedLine} onChange={updateLine} />
            </CardContent>
          </Card>
        </Box>
        <Box>
          <Card variant="outlined">
            <CardContent>
              <PreviewPanel doc={doc} plainText={plainText} />
            </CardContent>
          </Card>
          {!validation.ok ? (
            <Card variant="outlined" sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" color="error">
                  校验错误
                </Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {validation.errors.map((error) => (
                    <Typography key={error} variant="caption" color="error">
                      {error}
                    </Typography>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          ) : null}
        </Box>
      </Box>
    </Stack>
  );
}
