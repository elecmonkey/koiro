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
import { adminPlaylists } from "../lib/sample-data";

export default function AdminPage() {
  return (
    <Box component="main" sx={{ pb: 8 }}>
      <Container sx={{ pt: 6 }}>
        <Stack spacing={1}>
          <Typography variant="h4">管理后台</Typography>
          <Typography variant="body2" color="text.secondary">
            播放列表管理 · 仅管理员可用
          </Typography>
        </Stack>
      </Container>

      <Container sx={{ pt: 4 }}>
        <Stack spacing={3}>
          <Card className="float-in">
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">新建 / 编辑播放列表</Typography>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <TextField label="播放列表名称" fullWidth />
                  <TextField label="封面对象 ID" fullWidth />
                </Stack>
                <TextField
                  label="简介"
                  fullWidth
                  multiline
                  minRows={3}
                />
                <Stack direction="row" spacing={1}>
                  <Button variant="contained">保存</Button>
                  <Button variant="outlined">重置</Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card className="float-in stagger-1">
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">播放列表列表</Typography>
                {adminPlaylists.map((list) => (
                  <Box key={list.id}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                      <Box flex={1}>
                        <Typography variant="subtitle1">{list.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {list.songs} 首 · 更新于 {list.updatedAt}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label="可编辑" size="small" />
                        <Button size="small" variant="outlined">
                          编辑
                        </Button>
                        <Button size="small">删除</Button>
                      </Stack>
                    </Stack>
                    <Divider sx={{ my: 2 }} />
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}
