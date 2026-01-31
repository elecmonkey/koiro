"use client";

import { Box, Card, CardContent, Container, Stack, Typography } from "@mui/material";
import { useLyricsEditor } from "./state/useLyricsEditor";
import LineList from "./components/LineList";
import LineEditor from "./components/LineEditor";
import PreviewPanel from "./components/PreviewPanel";
import { validateBlocks } from "./ast/validate";

export default function EditorShell() {
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
  } = useLyricsEditor();

  const validation = validateBlocks(doc.blocks);

  return (
    <Container sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Stack spacing={0.5}>
          <Typography variant="h4">歌词编辑器</Typography>
          <Typography variant="body2" color="text.secondary">
            行级时间轴 · KOIRO_AST_V1
          </Typography>
        </Stack>
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
    </Container>
  );
}
