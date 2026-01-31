import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PERMISSIONS, checkApiPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { GetObjectCommand, getSignedUrl, s3Client } from "@/lib/s3";

// GET - 获取随机歌曲
export async function GET(request: NextRequest) {
  const session = await auth();
  const permissions = session?.user?.permissions;
  if (!checkApiPermission(permissions, PERMISSIONS.VIEW, true)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "3", 10), 10);

  // 使用原生 SQL 获取随机歌曲 ID
  const randomIds = (await prisma.$queryRaw`
    SELECT id FROM "Song" ORDER BY random() LIMIT ${limit}
  `) as { id: string }[];

  if (randomIds.length === 0) {
    return NextResponse.json({ songs: [] });
  }

  // 使用 Prisma 查询完整数据（包括歌词）
  const songsWithLyrics = await prisma.song.findMany({
    where: { id: { in: randomIds.map((r) => r.id) } },
    include: {
      lyrics: {
        where: { isDefault: true },
        take: 1,
      },
    },
  });

  const songs = await Promise.all(
    songsWithLyrics.map(async (song) => ({
      id: song.id,
      title: song.title,
      description: song.description ?? "",
      staff: (song.staff as { role: string; name: string }[]) ?? [],
      audioVersions: (song.audioVersions as Record<string, string>) ?? {},
      coverUrl: song.coverObjectId ? await signObjectUrl(song.coverObjectId) : null,
      lyrics: song.lyrics[0]?.content ?? null,
    }))
  );

  return NextResponse.json({ songs });
}

async function signObjectUrl(objectId: string) {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_ENDPOINT === "true" ? process.env.S3_ENDPOINT : process.env.S3_BUCKET,
    Key: objectId,
  });
  return getSignedUrl(s3Client, command, { expiresIn: 60 * 5 });
}
