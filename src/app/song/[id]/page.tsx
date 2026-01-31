import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { lyricsPreview, songs } from "../../lib/sample-data";
import { requireAuth } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";

export default async function SongDetailPage() {
  await requireAuth({ permission: PERMISSIONS.VIEW, allowAnonymous: true });
  const song = songs[0];

  return (
    <Box component="main" sx={{ pb: 8 }}>
      <Container sx={{ pt: 6 }}>
        <Stack spacing={3}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
            <Box
              sx={{
                width: { xs: "100%", md: 280 },
                height: 280,
                borderRadius: 4,
                background: song.cover,
              }}
            />
            <Stack spacing={2} flex={1}>
              <Stack spacing={1}>
                <Typography variant="h4">{song.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {song.description}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {Object.entries(song.staff).map(([role, name]) => (
                  <Chip key={role} label={`${role} · ${name}`} />
                ))}
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {Object.keys(song.versions).map((key) => (
                  <Chip
                    key={key}
                    label={key === "default" ? "默认" : key}
                    variant={key === "default" ? "filled" : "outlined"}
                    color={key === "default" ? "primary" : "default"}
                  />
                ))}
              </Stack>
              <Stack direction="row" spacing={1.5}>
                <Button variant="contained">在线播放</Button>
                <Button variant="outlined">下载</Button>
              </Stack>
            </Stack>
          </Stack>
        </Stack>
      </Container>

      <Container sx={{ pt: 4 }}>
        <Stack spacing={3}>
          <Card className="float-in">
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="h6">歌词预览</Typography>
                  <Chip label="KOIRO_AST_V1" size="small" />
                </Stack>
                {lyricsPreview.map((line) => (
                  <Typography key={line} variant="body2" color="text.secondary">
                    {line}
                  </Typography>
                ))}
              </Stack>
            </CardContent>
          </Card>

          <Card className="float-in stagger-1">
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">版本与对象存储</Typography>
                {Object.entries(song.versions).map(([key, value]) => (
                  <Box key={key}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Chip label={key === "default" ? "默认" : key} />
                      <Typography variant="body2" color="text.secondary">
                        对象 ID: {value}
                      </Typography>
                    </Stack>
                    <Divider sx={{ my: 1.5 }} />
                  </Box>
                ))}
                <Typography variant="caption" color="text.secondary">
                  对象前缀：music/ · 流媒体前缀：hls/
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}
