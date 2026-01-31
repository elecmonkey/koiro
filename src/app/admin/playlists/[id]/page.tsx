import { Container, Typography } from "@mui/material";
import { requireAuth } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import PlaylistSongsClient from "./PlaylistSongsClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PlaylistManagePage({ params }: PageProps) {
  const resolvedParams = await params;
  const playlistId = resolvedParams?.id ? decodeURIComponent(resolvedParams.id) : "";

  if (!playlistId) {
    return (
      <Container sx={{ pt: 8 }}>
        <Typography variant="h6">无效的播放列表 ID</Typography>
      </Container>
    );
  }

  await requireAuth({ permission: PERMISSIONS.ADMIN });

  const playlist = await prisma.playlist.findUnique({
    where: { id: playlistId },
    include: {
      songs: {
        include: {
          song: {
            select: {
              id: true,
              title: true,
              description: true,
              coverObjectId: true,
            },
          },
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!playlist) {
    return (
      <Container sx={{ pt: 8 }}>
        <Typography variant="h6">播放列表不存在</Typography>
      </Container>
    );
  }

  // 获取所有歌曲用于添加
  const allSongs = await prisma.song.findMany({
    select: {
      id: true,
      title: true,
      description: true,
    },
    orderBy: { title: "asc" },
  });

  const initialData = {
    id: playlist.id,
    name: playlist.name,
    songs: playlist.songs.map((sp) => ({
      id: sp.song.id,
      title: sp.song.title,
      description: sp.song.description,
      coverObjectId: sp.song.coverObjectId,
      order: sp.order,
    })),
  };

  const availableSongs = allSongs.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
  }));

  return (
    <PlaylistSongsClient
      playlist={initialData}
      availableSongs={availableSongs}
    />
  );
}
