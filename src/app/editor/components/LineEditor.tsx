import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import type { LineDraft } from "../state/useLyricsEditor";

type LineEditorProps = {
  line: LineDraft | undefined;
  onChange: (id: string, updates: Partial<LineDraft>) => void;
};

export default function LineEditor({ line, onChange }: LineEditorProps) {
  if (!line) {
    return <Typography variant="body2">请选择一行开始编辑。</Typography>;
  }

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle1">编辑行</Typography>
      <Stack direction="row" spacing={2}>
        <TextField
          label="startMs"
          type="number"
          value={line.startMs}
          onChange={(event) =>
            onChange(line.id, { startMs: Number(event.target.value) })
          }
          fullWidth
        />
        <TextField
          label="endMs"
          type="number"
          value={line.endMs ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            onChange(line.id, {
              endMs: value === "" ? undefined : Number(value),
            });
          }}
          fullWidth
        />
      </Stack>
      <TextField
        label="内容"
        value={line.text}
        onChange={(event) =>
          onChange(line.id, { text: event.target.value, rubyByIndex: {} })
        }
        multiline
        minRows={4}
        fullWidth
        helperText="用斜线 / 分词后，可在下方为分词添加注音。"
      />
      <Stack direction="row" spacing={1}>
        <Button
          size="small"
          variant="outlined"
          onClick={() =>
            onChange(line.id, {
              text: splitToChars(line.text),
              rubyByIndex: {},
            })
          }
        >
          按字符分词
        </Button>
        <Button
          size="small"
          onClick={() => onChange(line.id, { rubyByIndex: {} })}
        >
          清空注音
        </Button>
      </Stack>
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          分词注音
        </Typography>
        <Stack spacing={1.5}>
          {tokenize(line.text).map((token, index) => (
            <Stack key={`${token}-${index}`} direction="row" spacing={1}>
              <TextField
                label="分词"
                value={token}
                fullWidth
                InputProps={{ readOnly: true }}
              />
              <TextField
                label="注音"
                value={line.rubyByIndex?.[index] ?? ""}
                onChange={(event) => {
                  const next = { ...(line.rubyByIndex ?? {}) };
                  const value = event.target.value.trim();
                  if (value) {
                    next[index] = value;
                  } else {
                    delete next[index];
                  }
                  onChange(line.id, { rubyByIndex: next });
                }}
                placeholder="例如：きみ"
                fullWidth
              />
            </Stack>
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}

function tokenize(text: string) {
  return text
    .split("/")
    .map((token) => token.trim())
    .filter(Boolean);
}

function splitToChars(text: string) {
  const chars = Array.from(text);
  const result: string[] = [];
  for (let i = 0; i < chars.length; i += 1) {
    const current = chars[i];
    if (current === "/") {
      continue;
    }
    result.push(current);
    const next = chars[i + 1];
    if (next && next !== "/") {
      result.push("/");
    }
  }
  return result.join("").replace(/\/+/g, "/").trim();
}
