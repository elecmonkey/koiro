import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{ id: string }>;
};

type AddSongsBody = {
  songIds: string[];
};

type RemoveSongBody = {
  songId: string;
};

type ReorderBody = {
  songIds: string[];
};

// POST - 添加歌曲到播放列表
export async function POST(request: Request, { params }: RouteParams) {
  const { id: playlistId } = await params;
  const session = await auth();
  const permissions = session?.user?.permissions ?? 0;
  if (!session?.user || !hasPermission(permissions, PERMISSIONS.ADMIN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as AddSongsBody;
  if (!body?.songIds?.length) {
    return NextResponse.json({ error: "需要提供歌曲ID" }, { status: 400 });
  }

  const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
  if (!playlist) {
    return NextResponse.json({ error: "播放列表不存在" }, { status: 404 });
  }

  // 获取当前最大 order
  const maxOrder = await prisma.songPlaylist.aggregate({
    where: { playlistId },
    _max: { order: true },
  });
  let nextOrder = (maxOrder._max.order ?? -1) + 1;

  // 批量添加歌曲（跳过已存在的）
  const existingSongs = await prisma.songPlaylist.findMany({
    where: { playlistId, songId: { in: body.songIds } },
    select: { songId: true },
  });
  const existingIds = new Set(existingSongs.map((s) => s.songId));

  const newSongIds = body.songIds.filter((id) => !existingIds.has(id));
  
  if (newSongIds.length > 0) {
    await prisma.songPlaylist.createMany({
      data: newSongIds.map((songId) => ({
        playlistId,
        songId,
        order: nextOrder++,
      })),
    });
  }

  return NextResponse.json({ 
    ok: true, 
    added: newSongIds.length,
    skipped: body.songIds.length - newSongIds.length,
  });
}

// DELETE - 从播放列表移除歌曲
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id: playlistId } = await params;
  const session = await auth();
  const permissions = session?.user?.permissions ?? 0;
  if (!session?.user || !hasPermission(permissions, PERMISSIONS.ADMIN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as RemoveSongBody;
  if (!body?.songId) {
    return NextResponse.json({ error: "需要提供歌曲ID" }, { status: 400 });
  }

  await prisma.songPlaylist.deleteMany({
    where: { playlistId, songId: body.songId },
  });

  return NextResponse.json({ ok: true });
}

// PUT - 重新排序播放列表中的歌曲
export async function PUT(request: Request, { params }: RouteParams) {
  const { id: playlistId } = await params;
  const session = await auth();
  const permissions = session?.user?.permissions ?? 0;
  if (!session?.user || !hasPermission(permissions, PERMISSIONS.ADMIN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as ReorderBody;
  if (!body?.songIds?.length) {
    return NextResponse.json({ error: "需要提供歌曲ID列表" }, { status: 400 });
  }

  // 批量更新 order
  await Promise.all(
    body.songIds.map((songId, index) =>
      prisma.songPlaylist.updateMany({
        where: { playlistId, songId },
        data: { order: index },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
