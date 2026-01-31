import {
  Box,
  Button,
  Card,
  Chip,
  Container,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { playlists } from "./lib/sample-data";
import { requireAuth } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { GetObjectCommand, getSignedUrl, s3Client } from "@/lib/s3";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  await requireAuth({ permission: PERMISSIONS.VIEW, allowAnonymous: true });
  const featuredSongs = await fetchRandomSongs(3);
  const nowPlaying = featuredSongs[0] ?? null;

  return (
    <Box component="main" sx={{ pb: 10 }}>
      <Container sx={{ pt: 4 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
          <Card className="float-in" variant="outlined" sx={{ flex: 1 }}>
            <Box sx={{ p: 4 }}>
              <Stack spacing={3}>
                <Stack spacing={1.2}>
                  <Typography variant="h2" sx={{ fontSize: { xs: 32, md: 44 } }}>
                    以「声の色」整理你的音乐收藏
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Koiro 是一个为个人收藏而生的音乐集合站点，支持多版本、歌词 AST 与流式试听。
                  </Typography>
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <TextField
                    fullWidth
                    placeholder="搜索歌曲、歌词或 Staff"
                    size="medium"
                  />
                  <Button variant="contained" size="large">
                    搜索
                  </Button>
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip label="随机推荐" color="primary" />
                  <Chip label="最近上传" variant="outlined" />
                  <Chip label="默认版本" variant="outlined" />
                  <Chip label="可下载" variant="outlined" />
                </Stack>
              </Stack>
            </Box>
          </Card>
          <Card className="float-in stagger-1" variant="outlined" sx={{ width: { md: 320 } }}>
            <Box sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Stack spacing={0.5}>
                  <Typography variant="subtitle1">正在播放</Typography>
                  <Typography variant="caption" color="text.secondary">
                    默认版本 · 在线试听
                  </Typography>
                </Stack>
                {nowPlaying ? (
                  <>
                    <Box
                      sx={{
                        height: 110,
                        background: nowPlaying.coverUrl
                          ? `url(${nowPlaying.coverUrl}) center/cover no-repeat`
                          : "linear-gradient(135deg, #f3efe7, #e8dfd1)",
                      }}
                    />
                    <Typography variant="h6">{nowPlaying.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {nowPlaying.description}
                    </Typography>
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    暂无可播放歌曲
                  </Typography>
                )}
                <Divider />
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">
                      转码队列
                    </Typography>
                    <Typography variant="caption">等待中 · 2</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined">
                      播放
                    </Button>
                    <Button size="small">详情</Button>
                  </Stack>
                </Stack>
              </Stack>
            </Box>
          </Card>
        </Stack>
      </Container>

      <Container sx={{ pt: 5 }}>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">播放列表</Typography>
            <Button size="small">管理</Button>
          </Stack>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(4, 1fr)",
              },
              gap: 2,
            }}
          >
            {playlists.map((list) => (
              <Box key={list.id}>
                <Card className="float-in stagger-1" variant="outlined">
                  <Box sx={{ p: 2.5 }}>
                    <Stack spacing={2}>
                      <Box sx={{ height: 120, background: list.cover }} />
                      <Stack spacing={0.5}>
                        <Typography variant="subtitle1">{list.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {list.songCount} 首 · {list.description}
                        </Typography>
                      </Stack>
                      <Button size="small" variant="outlined">
                        打开
                      </Button>
                    </Stack>
                  </Box>
                </Card>
              </Box>
            ))}
          </Box>
        </Stack>
      </Container>

      <Container sx={{ pt: 5 }}>
        <Card className="float-in stagger-2" variant="outlined">
          <Box sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack spacing={0.3}>
                  <Typography variant="h6">随机推荐</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {featuredSongs.length} 首
                  </Typography>
                </Stack>
                <Button size="small" variant="outlined" href="/">
                  刷新推荐
                </Button>
              </Stack>
              <Divider />
              {featuredSongs.map((song) => (
                <Box key={song.id}>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        sm: "120px 1fr",
                        md: "120px 1fr 180px",
                      },
                      gap: 2,
                      alignItems: "center",
                    }}
                  >
                    <Box
                      sx={{
                        height: 72,
                        background: song.coverUrl
                          ? `url(${song.coverUrl}) center/cover no-repeat`
                          : "linear-gradient(135deg, #f3efe7, #e8dfd1)",
                      }}
                    />
                    <Stack spacing={0.6}>
                      <Typography variant="subtitle1">{song.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {song.description}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {(song.staff ?? []).map((item) => (
                          <Chip
                            key={`${item.role}-${item.name}`}
                            label={`${item.role} · ${item.name}`}
                            size="small"
                          />
                        ))}
                      </Stack>
                    </Stack>
                    <Stack
                      spacing={1}
                      alignItems={{ xs: "flex-start", sm: "flex-end" }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {Object.keys(song.audioVersions ?? {}).length} 版本
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant="outlined">
                          播放
                        </Button>
                        <Button size="small" component="a" href={`/songs/${song.id}`}>
                          详情
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                </Box>
              ))}
            </Stack>
          </Box>
        </Card>
      </Container>
    </Box>
  );
}

type SongCard = {
  id: string;
  title: string;
  description: string;
  staff: { role: string; name: string }[];
  audioVersions: Record<string, string>;
  coverUrl: string | null;
};

async function fetchRandomSongs(limit: number): Promise<SongCard[]> {
  const rows = (await prisma.$queryRaw`
    SELECT id, title, description, staff, "coverObjectId", "audioVersions"
    FROM "Song"
    ORDER BY random()
    LIMIT ${limit}
  `) as {
    id: string;
    title: string;
    description: string;
    staff: { role: string; name: string }[] | null;
    coverObjectId: string | null;
    audioVersions: Record<string, string> | null;
  }[];

  return Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      title: row.title,
      description: row.description ?? "",
      staff: row.staff ?? [],
      audioVersions: row.audioVersions ?? {},
      coverUrl: row.coverObjectId ? await signObjectUrl(row.coverObjectId) : null,
    }))
  );
}

async function signObjectUrl(objectId: string) {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_ENDPOINT === "true" ? process.env.S3_ENDPOINT : process.env.S3_BUCKET,
    Key: objectId,
  });
  return getSignedUrl(s3Client, command, { expiresIn: 60 * 5 });
}
