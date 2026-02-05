import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 10;

// GET - 获取所有播放列表
export async function GET(request: NextRequest) {
  const session = await auth();
  const permissions = session?.user?.permissions ?? 0;
  if (!session?.user || !hasPermission(permissions, PERMISSIONS.ADMIN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const keyword = searchParams.get("q")?.trim();

  const where = keyword
    ? {
        OR: [
          { name: { contains: keyword, mode: "insensitive" as const } },
          { description: { contains: keyword, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const total = await prisma.playlist.count({ where });

  const playlists = await prisma.playlist.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      _count: {
        select: { songs: true },
      },
    },
  });

  return NextResponse.json({
    playlists: playlists.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      coverObjectId: p.coverObjectId,
      songCount: p._count.songs,
      updatedAt: p.updatedAt.toISOString(),
    })),
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    },
  });
}

type CreatePlaylistBody = {
  name: string;
  description: string;
  coverObjectId: string;
};

// POST - 创建播放列表
export async function POST(request: Request) {
  const session = await auth();
  const permissions = session?.user?.permissions ?? 0;
  if (!session?.user || !hasPermission(permissions, PERMISSIONS.ADMIN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as CreatePlaylistBody;
  if (!body?.name?.trim()) {
    return NextResponse.json({ error: "播放列表名称不能为空" }, { status: 400 });
  }
  if (!body?.coverObjectId) {
    return NextResponse.json({ error: "必须上传封面" }, { status: 400 });
  }

  const playlist = await prisma.playlist.create({
    data: {
      name: body.name.trim(),
      description: body.description?.trim() ?? "",
      coverObjectId: body.coverObjectId,
    },
  });

  return NextResponse.json({ ok: true, id: playlist.id });
}
