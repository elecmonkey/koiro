import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PERMISSIONS, checkApiPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { GetObjectCommand, getSignedUrl, s3Client } from "@/lib/s3";

const PAGE_SIZE = 10;

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET - 获取播放列表详情及歌曲（支持分页）
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await auth();
  const permissions = session?.user?.permissions;
  if (!checkApiPermission(permissions, PERMISSIONS.VIEW, true)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

  // 获取播放列表基本信息
  const playlist = await prisma.playlist.findUnique({
    where: { id },
    include: {
      _count: {
        select: { songs: true },
      },
    },
  });

  if (!playlist) {
    return NextResponse.json({ error: "播放列表不存在" }, { status: 404 });
  }

  // 获取封面 URL
  let coverUrl: string | null = null;
  if (playlist.coverObjectId) {
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_ENDPOINT === "true" ? process.env.S3_ENDPOINT : process.env.S3_BUCKET,
        Key: playlist.coverObjectId,
      });
      coverUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 * 30 });
    } catch {
      // ignore
    }
  }

  // 获取分页歌曲
  const total = playlist._count.songs;
  const songPlaylist = await prisma.songPlaylist.findMany({
    where: { playlistId: id },
    orderBy: { order: "asc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      song: true,
    },
  });

  // 获取歌曲封面 URL
  const songs = await Promise.all(
    songPlaylist.map(async (sp) => {
      let songCoverUrl: string | null = null;
      if (sp.song.coverObjectId) {
        try {
          const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_ENDPOINT === "true" ? process.env.S3_ENDPOINT : process.env.S3_BUCKET,
            Key: sp.song.coverObjectId,
          });
          songCoverUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 * 30 });
        } catch {
          // ignore
        }
      }
      return {
        id: sp.song.id,
        title: sp.song.title,
        description: sp.song.description,
        staff: sp.song.staff as { role: string; name: string }[],
        coverUrl: songCoverUrl,
        order: sp.order,
      };
    })
  );

  return NextResponse.json({
    playlist: {
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      coverUrl,
      songCount: total,
      updatedAt: playlist.updatedAt.toISOString(),
    },
    songs,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    },
  });
}
