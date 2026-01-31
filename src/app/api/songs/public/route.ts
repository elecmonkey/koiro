import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PERMISSIONS, checkApiPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { GetObjectCommand, getSignedUrl, s3Client } from "@/lib/s3";

const PAGE_SIZE = 10;

// GET - 获取所有歌曲（支持分页）
export async function GET(request: NextRequest) {
  const session = await auth();
  const permissions = session?.user?.permissions;
  if (!checkApiPermission(permissions, PERMISSIONS.VIEW, true)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

  // 获取总数
  const total = await prisma.song.count();

  // 获取分页数据
  const songs = await prisma.song.findMany({
    orderBy: { updatedAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  // 获取封面签名 URL
  const songsWithCover = await Promise.all(
    songs.map(async (s) => {
      let coverUrl: string | null = null;
      if (s.coverObjectId) {
        try {
          const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_ENDPOINT === "true" ? process.env.S3_ENDPOINT : process.env.S3_BUCKET,
            Key: s.coverObjectId,
          });
          coverUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 * 30 });
        } catch {
          // ignore
        }
      }
      return {
        id: s.id,
        title: s.title,
        description: s.description,
        staff: s.staff as { role: string; name: string }[],
        coverUrl,
        updatedAt: s.updatedAt.toISOString(),
      };
    })
  );

  return NextResponse.json({
    songs: songsWithCover,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    },
  });
}
