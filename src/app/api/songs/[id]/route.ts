import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET - 获取单个歌曲详情（管理用）
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const session = await auth();
  const permissions = session?.user?.permissions ?? 0;
  if (!session?.user || !hasPermission(permissions, PERMISSIONS.ADMIN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const song = await prisma.song.findUnique({
    where: { id },
    include: {
      lyrics: true,
      playlists: {
        include: {
          playlist: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  if (!song) {
    return NextResponse.json({ error: "歌曲不存在" }, { status: 404 });
  }

  return NextResponse.json({
    song: {
      id: song.id,
      title: song.title,
      description: song.description,
      staff: song.staff,
      coverObjectId: song.coverObjectId,
      audioVersions: song.audioVersions,
      audioDefaultName: song.audioDefaultName,
      lyrics: song.lyrics.map((l) => ({
        id: l.id,
        versionKey: l.versionKey,
        isDefault: l.isDefault,
      })),
      playlists: song.playlists.map((sp) => ({
        id: sp.playlist.id,
        name: sp.playlist.name,
      })),
      createdAt: song.createdAt.toISOString(),
      updatedAt: song.updatedAt.toISOString(),
    },
  });
}

type UpdateSongBody = {
  title?: string;
  description?: string;
  staff?: { role: string; name: string }[];
  coverObjectId?: string;
  audioVersions?: Record<string, string>;
  audioDefaultName?: string;
};

// PUT - 更新歌曲
export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const session = await auth();
  const permissions = session?.user?.permissions ?? 0;
  if (!session?.user || !hasPermission(permissions, PERMISSIONS.ADMIN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as UpdateSongBody;

  const existing = await prisma.song.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "歌曲不存在" }, { status: 404 });
  }

  const song = await prisma.song.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title.trim() }),
      ...(body.description !== undefined && { description: body.description.trim() }),
      ...(body.staff !== undefined && { staff: body.staff }),
      ...(body.coverObjectId !== undefined && { coverObjectId: body.coverObjectId }),
      ...(body.audioVersions !== undefined && { audioVersions: body.audioVersions }),
      ...(body.audioDefaultName !== undefined && { audioDefaultName: body.audioDefaultName }),
    },
  });

  return NextResponse.json({ ok: true, id: song.id });
}

// DELETE - 删除歌曲
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const session = await auth();
  const permissions = session?.user?.permissions ?? 0;
  if (!session?.user || !hasPermission(permissions, PERMISSIONS.ADMIN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.song.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "歌曲不存在" }, { status: 404 });
  }

  await prisma.song.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
