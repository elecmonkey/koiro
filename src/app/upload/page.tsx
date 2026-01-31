import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { requireAuth } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import EditorShell from "../editor/EditorShell";

export default async function UploadPage() {
  await requireAuth({ permission: PERMISSIONS.UPLOAD });
  return (
    <Box component="main" sx={{ pb: 8 }}>
      <Container sx={{ pt: 6 }}>
        <Stack spacing={1}>
          <Typography variant="h4">上传歌曲</Typography>
          <Typography variant="body2" color="text.secondary">
            支持上传音频后自动转码为 HLS 流
          </Typography>
        </Stack>
      </Container>

      <Container sx={{ pt: 4 }}>
        <Stack spacing={3}>
          <Card className="float-in">
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">音频文件</Typography>
                <Box
                  sx={{
                    border: "1px dashed rgba(31, 26, 22, 0.25)",
                    borderRadius: 3,
                    p: 4,
                    textAlign: "center",
                  }}
                >
                  <Typography variant="subtitle1">拖拽文件到此处</Typography>
                  <Typography variant="body2" color="text.secondary">
                    或选择本地音频文件（WAV / FLAC / MP3）
                  </Typography>
                  <Button variant="outlined" sx={{ mt: 2 }}>
                    选择文件
                  </Button>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip label="转码队列：待处理" />
                  <Chip label="目标：m3u8 + AAC" variant="outlined" />
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card className="float-in stagger-1">
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">歌曲信息</Typography>
                <Stack spacing={2}>
                  <TextField label="歌曲名" placeholder="例如：玻璃海" fullWidth />
                  <TextField
                    label="简介"
                    placeholder="描述这首歌的氛围、来源..."
                    fullWidth
                    multiline
                    minRows={3}
                  />
                  <TextField
                    label="Staff (JSON)"
                    placeholder='{"作词":"张三","演唱":"王五"}'
                    fullWidth
                  />
                  <TextField
                    label="版本列表 (JSON)"
                    placeholder='{"default":"objId","伴奏":"objId"}'
                    fullWidth
                  />
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card className="float-in stagger-2">
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">歌词与预览</Typography>
                <EditorShell />
                <Divider />
                <Stack direction="row" spacing={1}>
                  <Button variant="outlined">校验 AST</Button>
                  <Button variant="contained">提交上传</Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}
