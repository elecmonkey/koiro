import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET - 获取单个播放列表详情
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const session = await auth();
  const permissions = session?.user?.permissions ?? 0;
  if (!session?.user || !hasPermission(permissions, PERMISSIONS.VIEW)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const playlist = await prisma.playlist.findUnique({
    where: { id },
    include: {
      songs: {
        include: {
          song: true,
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!playlist) {
    return NextResponse.json({ error: "播放列表不存在" }, { status: 404 });
  }

  return NextResponse.json({
    playlist: {
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      coverObjectId: playlist.coverObjectId,
      songs: playlist.songs.map((sp) => ({
        id: sp.song.id,
        title: sp.song.title,
        description: sp.song.description,
        coverObjectId: sp.song.coverObjectId,
        order: sp.order,
      })),
      updatedAt: playlist.updatedAt.toISOString(),
    },
  });
}

type UpdatePlaylistBody = {
  name?: string;
  description?: string;
  coverObjectId?: string;
};

// PUT - 更新播放列表
export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const session = await auth();
  const permissions = session?.user?.permissions ?? 0;
  if (!session?.user || !hasPermission(permissions, PERMISSIONS.ADMIN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as UpdatePlaylistBody;

  const existing = await prisma.playlist.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "播放列表不存在" }, { status: 404 });
  }

  const playlist = await prisma.playlist.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name.trim() }),
      ...(body.description !== undefined && { description: body.description.trim() }),
      ...(body.coverObjectId !== undefined && { coverObjectId: body.coverObjectId }),
    },
  });

  return NextResponse.json({ ok: true, id: playlist.id });
}

// DELETE - 删除播放列表
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const session = await auth();
  const permissions = session?.user?.permissions ?? 0;
  if (!session?.user || !hasPermission(permissions, PERMISSIONS.ADMIN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.playlist.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "播放列表不存在" }, { status: 404 });
  }

  await prisma.playlist.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
