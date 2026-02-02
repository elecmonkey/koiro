import {
  Box,
  Chip,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";
import CoverArt from "@/app/components/CoverArt";
import { AudioControls, LyricsDisplay, type AudioVersion, type LyricsVersion } from "./SongDetailClient";
import { GetObjectCommand, getSignedUrl, s3Client } from "@/lib/s3";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SongDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const songId = resolvedParams?.id ? decodeURIComponent(resolvedParams.id) : "";
  if (!songId) {
    return (
      <Container sx={{ pt: 8 }}>
        <Typography variant="h6">无效的歌曲 ID</Typography>
      </Container>
    );
  }

  const session = await requireAuth({ permission: PERMISSIONS.VIEW, allowAnonymous: true });
  const permissions = session?.user?.permissions ?? 0;

  const song = await prisma.song.findUnique({
    where: { id: songId },
    include: { lyrics: true },
  });

  if (!song) {
    const recent = await prisma.song.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true },
    });
    return (
      <Container sx={{ pt: 8 }}>
        <Stack spacing={2}>
          <Typography variant="h6">未找到歌曲</Typography>
          <Typography variant="body2" color="text.secondary">
            ID: {songId}
          </Typography>
          {recent.length > 0 ? (
            <Stack spacing={1}>
              <Typography variant="subtitle2">最近上传</Typography>
              {recent.map((item) => (
                <Link key={item.id} href={`/songs/${item.id}`}>
                  <Typography variant="body2">{item.title}</Typography>
                </Link>
              ))}
            </Stack>
          ) : null}
        </Stack>
      </Container>
    );
  }

  const staff = Array.isArray(song.staff)
    ? (song.staff as { role?: string; name?: string | string[] }[]).filter(
        (item) => item && typeof item === "object"
      )
    : [];
  const audioVersionsRaw = (song.audioVersions ?? {}) as Record<string, string | { objectId: string; lyricsId?: string | null }>;
  const coverUrl = song.coverObjectId ? await signObjectUrl(song.coverObjectId) : null;
  const canDownload = hasPermission(permissions, PERMISSIONS.DOWNLOAD);

  // 构建音频版本列表
  const audioVersions: AudioVersion[] = Object.entries(audioVersionsRaw).map(([key, value]) => {
    // 兼容旧格式（直接是objectId字符串）和新格式（对象）
    const objectId = typeof value === 'string' ? value : value.objectId;
    const lyricsId = typeof value === 'string' ? null : (value.lyricsId ?? null);
    
    return {
      key,
      objectId,
      isDefault: key === song.audioDefaultName,
      lyricsId,
    };
  });

  // 构建歌词版本列表
  const lyricsVersions: LyricsVersion[] = song.lyrics.map((lyr) => ({
    id: lyr.id,
    versionKey: lyr.versionKey,
    isDefault: lyr.isDefault,
    content: lyr.content as LyricsVersion["content"],
  }));

  // 构建艺术家信息（从 staff 中提取）
  const artistInfo = staff
    .filter((s) => s.role?.toLowerCase().includes("vocal") || s.role?.toLowerCase().includes("歌"))
    .map((s) => Array.isArray(s.name) ? s.name.join("、") : s.name)
    .join(", ") || (Array.isArray(staff[0]?.name) ? staff[0].name.join("、") : staff[0]?.name);

  return (
    <Box component="main" sx={{ pb: 8 }}>
      <Container sx={{ pt: 6 }}>
        <Stack spacing={3}>
          <Stack spacing={3}>
            <CoverArt url={coverUrl} height="auto" width="100%" alt={song.title} />
            <Stack spacing={2}>
              <Stack spacing={1}>
                <Typography variant="h4">{song.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-line" }}>
                  {song.description}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {staff.map((item, index) => (
                  <Chip
                    key={`${item.role ?? "role"}-${index}`}
                    label={`${item.role ?? "Staff"} · ${Array.isArray(item.name) ? item.name.join("、") : (item.name ?? "")}`}
                  />
                ))}
              </Stack>

              {/* 音频控制：版本切换 + 播放/下载 */}
              <AudioControls
                song={{
                  id: song.id,
                  title: song.title,
                  artist: artistInfo,
                  coverUrl,
                }}
                audioVersions={audioVersions}
                canDownload={canDownload}
                lyricsVersions={lyricsVersions}
              />
            </Stack>
          </Stack>
        </Stack>
      </Container>

      <Container sx={{ pt: 4 }}>
        <Stack spacing={3}>
          {/* 歌词显示：支持多版本切换 */}
          <LyricsDisplay lyrics={lyricsVersions} />
        </Stack>
      </Container>
    </Box>
  );
}

async function signObjectUrl(objectId: string) {
  const command = new GetObjectCommand({
    Bucket:
      process.env.S3_BUCKET_ENDPOINT === "true"
        ? process.env.S3_ENDPOINT
        : process.env.S3_BUCKET,
    Key: objectId,
  });
  return getSignedUrl(s3Client, command, { expiresIn: 60 * 5 });
}
