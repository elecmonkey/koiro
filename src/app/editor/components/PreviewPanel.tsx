import { Box, Stack, Typography } from "@mui/material";
import type { LyricsDocument, Inline, Block } from "../ast/types";

type PreviewPanelProps = {
  doc: LyricsDocument;
  plainText: string;
};

export default function PreviewPanel({ doc, plainText }: PreviewPanelProps) {
  return (
    <Stack spacing={2}>
      <Typography variant="subtitle1">预览</Typography>
      <Box
        sx={{
          border: "1px solid rgba(31, 26, 22, 0.12)",
          p: 2,
          minHeight: 200,
          background: "#fff",
        }}
      >
        {doc.blocks.map((block, index) => (
          <BlockView key={index} block={block} />
        ))}
      </Box>
      <Typography variant="subtitle2">plainText</Typography>
      <Box
        sx={{
          border: "1px solid rgba(31, 26, 22, 0.12)",
          p: 2,
          background: "#fff",
          fontSize: 12,
          whiteSpace: "pre-wrap",
        }}
      >
        {plainText || "(空)"}
      </Box>
    </Stack>
  );
}

function BlockView({ block }: { block: Block }) {
  if (block.type === "p") {
    return (
      <Typography variant="body2" color="text.secondary">
        {renderInline(block.children)}
      </Typography>
    );
  }

  return (
    <Stack direction="row" spacing={2} alignItems="baseline">
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 72 }}>
        {block.time?.startMs ?? 0}ms
      </Typography>
      <Typography variant="body1">{renderInline(block.children)}</Typography>
    </Stack>
  );
}

function renderInline(inlines: Inline[]): React.ReactNode {
  return inlines.map((inline, index) => {
    switch (inline.type) {
      case "text":
        return <span key={index}>{inline.text}</span>;
      case "ruby":
        return (
          <ruby key={index}>
            {inline.base}
            <rt style={{ fontSize: "0.7em" }}>{inline.ruby}</rt>
          </ruby>
        );
      case "annotation":
        return (
          <span key={index} title={inline.note}>
            {inline.text}
          </span>
        );
      case "em":
        return <em key={index}>{renderInline(inline.children)}</em>;
      case "strong":
        return <strong key={index}>{renderInline(inline.children)}</strong>;
      case "br":
        return <br key={index} />;
      default:
        return null;
    }
  });
}
