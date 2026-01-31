import { Container, Typography } from "@mui/material";
import { requireAuth } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import EditSongClient from "./EditSongClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EditSongPage({ params }: PageProps) {
  const resolvedParams = await params;
  const songId = resolvedParams?.id ? decodeURIComponent(resolvedParams.id) : "";

  if (!songId) {
    return (
      <Container sx={{ pt: 8 }}>
        <Typography variant="h6">无效的歌曲 ID</Typography>
      </Container>
    );
  }

  // 需要管理员权限
  await requireAuth({ permission: PERMISSIONS.ADMIN });

  const song = await prisma.song.findUnique({
    where: { id: songId },
    include: { 
      lyrics: true,
      playlists: {
        include: { playlist: { select: { id: true, name: true } } },
      },
    },
  });

  if (!song) {
    return (
      <Container sx={{ pt: 8 }}>
        <Typography variant="h6">未找到歌曲</Typography>
      </Container>
    );
  }

  // 转换数据格式以匹配 SongForm
  const audioVersionsRaw = (song.audioVersions ?? {}) as Record<string, string>;
  const versions = Object.entries(audioVersionsRaw).map(([key, objectId], index) => ({
    id: `ver_${index}`,
    key,
    objectId,
    isDefault: key === song.audioDefaultName,
  }));

  const staff = Array.isArray(song.staff)
    ? (song.staff as { role?: string; name?: string }[]).map((s, index) => ({
        id: `staff_${index}`,
        role: s.role ?? "",
        name: s.name ?? "",
      }))
    : [];

  // 转换歌词格式
  type LyricsLine = {
    id: string;
    startMs: number;
    endMs?: number;
    text: string;
    rubyByIndex?: Record<number, string>;
  };

  type LyricsBlock = {
    type: string;
    time?: { startMs?: number; endMs?: number };
    children?: { type: string; text?: string; base?: string; ruby?: string }[];
  };

  type LyricsContent = {
    type: string;
    blocks?: LyricsBlock[];
  };

  const lyricsVersions = song.lyrics.map((lyr) => {
    const content = lyr.content as LyricsContent;
    const blocks = content?.blocks ?? [];
    const lines: LyricsLine[] = blocks
      .filter((block) => block.type === "line")
      .map((block, index) => {
        // 从 children 中提取文本，用 "/" 连接（以便保留分词信息）
        const textParts: string[] = [];
        const rubyByIndex: Record<number, string> = {};
        let tokenIndex = 0;
        
        (block.children ?? []).forEach((child) => {
          if (child.type === "text" && child.text) {
            textParts.push(child.text);
            tokenIndex++;
          } else if (child.type === "ruby" && child.base) {
            textParts.push(child.base);
            if (child.ruby) {
              rubyByIndex[tokenIndex] = child.ruby;
            }
            tokenIndex++;
          }
        });

        return {
          id: `line_${lyr.id}_${index}`,
          startMs: block.time?.startMs ?? 0,
          endMs: block.time?.endMs,
          text: textParts.join("/"),
          rubyByIndex: Object.keys(rubyByIndex).length > 0 ? rubyByIndex : undefined,
        };
      });

    return {
      id: lyr.id,
      key: lyr.versionKey,
      isDefault: lyr.isDefault,
      lines,
    };
  });

  const initialData = {
    title: song.title,
    description: song.description ?? "",
    staff,
    versions,
    audioDefaultName: song.audioDefaultName,
    lyricsVersions,
    coverObjectId: song.coverObjectId,
    coverFilename: null,
    playlistIds: song.playlists.map((sp) => sp.playlist.id),
  };

  return <EditSongClient songId={songId} initialData={initialData} />;
}
