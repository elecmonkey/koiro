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
import Link from "next/link";
import CoverArt from "@/app/components/CoverArt";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { s3Client } from "@/lib/s3";

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
    ? (song.staff as { role?: string; name?: string }[]).filter(
        (item) => item && typeof item === "object"
      )
    : [];
  const audioVersions = (song.audioVersions ?? {}) as Record<string, string>;
  const coverUrl = song.coverObjectId ? await signObjectUrl(song.coverObjectId) : null;
  const canDownload = hasPermission(permissions, PERMISSIONS.DOWNLOAD);

  const lyricsDoc = song.lyrics.find((lyr) => lyr.isDefault) ?? song.lyrics[0] ?? null;

  const audioEntries = await Promise.all(
    Object.entries(audioVersions).map(async ([key, objectId]) => ({
      key,
      objectId,
      downloadUrl: canDownload ? await signObjectUrl(objectId) : null,
    }))
  );

  return (
    <Box component="main" sx={{ pb: 8 }}>
      <Container sx={{ pt: 6 }}>
        <Stack spacing={3}>
          <Stack spacing={3}>
            <CoverArt url={coverUrl} height="auto" width="100%" alt={song.title} />
            <Stack spacing={2}>
              <Stack spacing={1}>
                <Typography variant="h4">{song.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {song.description}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {staff.map((item, index) => (
                  <Chip
                    key={`${item.role ?? "role"}-${item.name ?? "name"}-${index}`}
                    label={`${item.role ?? "Staff"} · ${item.name ?? ""}`}
                  />
                ))}
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {audioEntries.map((item) => (
                  <Chip
                    key={item.key}
                    label={item.key === song.audioDefaultName ? "默认" : item.key}
                    variant={item.key === song.audioDefaultName ? "filled" : "outlined"}
                    color={item.key === song.audioDefaultName ? "primary" : "default"}
                  />
                ))}
              </Stack>
              <Stack direction="row" spacing={1.5}>
                <Button variant="contained">在线播放</Button>
                <Button variant="outlined" disabled={!canDownload}>
                  下载
                </Button>
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
                </Stack>
                {lyricsDoc ? (
                  <Stack spacing={1}>
                    {renderLyricsBlocks(lyricsDoc.content as LyricsContent)}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    暂无歌词
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>

          <Card className="float-in stagger-1">
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">版本与对象存储</Typography>
                {audioEntries.map((item) => (
                  <Box key={item.key}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Chip label={item.key === song.audioDefaultName ? "默认" : item.key} />
                      <Typography variant="body2" color="text.secondary">
                        对象 ID: {item.objectId}
                      </Typography>
                      {item.downloadUrl ? (
                        <Button size="small" variant="outlined" href={item.downloadUrl}>
                          下载
                        </Button>
                      ) : null}
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

type LyricsContent = {
  type: "doc";
  blocks: Array<
    | {
        type: "line";
        time?: { startMs: number; endMs?: number };
        children: InlineNode[];
      }
    | { type: "p"; children: InlineNode[] }
  >;
};

type InlineNode =
  | { type: "text"; text: string }
  | { type: "ruby"; base: string; ruby: string }
  | { type: "em"; children: InlineNode[] }
  | { type: "strong"; children: InlineNode[] }
  | { type: "annotation"; text: string; note: string }
  | { type: "br" };

function renderLyricsBlocks(content: LyricsContent) {
  if (!content || content.type !== "doc" || !Array.isArray(content.blocks)) {
    return (
      <Typography variant="body2" color="text.secondary">
        歌词格式异常
      </Typography>
    );
  }
  return content.blocks.map((block, index) => {
    if (block.type === "line") {
      return (
        <Typography key={`line-${index}`} variant="body1" sx={{ lineHeight: 1.9 }}>
          {block.children.map((node, idx) => renderInline(node, `line-${index}-${idx}`))}
        </Typography>
      );
    }
    if (block.type === "p") {
      return (
        <Typography
          key={`p-${index}`}
          variant="body2"
          color="text.secondary"
          sx={{ lineHeight: 1.9 }}
        >
          {block.children.map((node, idx) => renderInline(node, `p-${index}-${idx}`))}
        </Typography>
      );
    }
    return null;
  });
}

function renderInline(node: InlineNode, key: string): React.ReactNode {
  switch (node.type) {
    case "text":
      return <span key={key}>{node.text}</span>;
    case "ruby":
      return (
        <ruby key={key}>
          {node.base}
          <rt>{node.ruby}</rt>
        </ruby>
      );
    case "em":
      return (
        <em key={key}>
          {node.children.map((child, idx) => renderInline(child, `${key}-${idx}`))}
        </em>
      );
    case "strong":
      return (
        <strong key={key}>
          {node.children.map((child, idx) => renderInline(child, `${key}-${idx}`))}
        </strong>
      );
    case "annotation":
      return (
        <span key={key} title={node.note} style={{ textDecoration: "underline dotted" }}>
          {node.text}
        </span>
      );
    case "br":
      return <br key={key} />;
    default:
      return null;
  }
}
