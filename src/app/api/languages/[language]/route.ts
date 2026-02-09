import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PERMISSIONS, checkApiPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { GetObjectCommand, getSignedUrl, getDefaultS3Client } from "@/lib/s3";

type RouteParams = {
  params: Promise<{ language: string }>;
};

const PAGE_SIZE = 20;

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  const permissions = session?.user?.permissions;
  if (!checkApiPermission(permissions, PERMISSIONS.VIEW, true)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { language } = await params;
  const decodedLanguage = decodeURIComponent(language);
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const offset = (page - 1) * PAGE_SIZE;

  // 获取所有歌曲及其歌词
  const allSongs = await prisma.song.findMany({
    include: {
      lyrics: {
        select: {
          id: true,
          content: true,
        },
      },
    },
  });

  // 筛选包含指定语种的歌曲
  const matchedSongIds = new Set<string>();
  for (const song of allSongs) {
    for (const lyr of song.lyrics) {
      const content = lyr.content as { meta?: { languages?: string[] } };
      const languages = content?.meta?.languages ?? [];
      if (languages.includes(decodedLanguage)) {
        matchedSongIds.add(song.id);
        break;
      }
    }
  }

  const total = matchedSongIds.size;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // 分页
  const songIdArray = Array.from(matchedSongIds);
  const paginatedIds = songIdArray.slice(offset, offset + PAGE_SIZE);

  // 获取完整歌曲数据
  const songs = await prisma.song.findMany({
    where: { id: { in: paginatedIds } },
    include: {
      lyrics: {
        where: { isDefault: true },
        select: {
          id: true,
          content: true,
        },
        take: 1,
      },
    },
  });

  // 按原始顺序排序
  const orderMap = new Map(paginatedIds.map((id, index) => [id, index]));
  songs.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

  // S3 客户端
  const s3Client = getDefaultS3Client();

  // 构建响应数据
  const songsData = await Promise.all(
    songs.map(async (song) => {
      const staff = song.staff as { role?: string; name?: string | string[] }[] | null;
      
      let coverUrl: string | null = null;
      if (song.coverObjectId) {
        try {
          const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_ENDPOINT === "true" ? process.env.S3_ENDPOINT : process.env.S3_BUCKET,
            Key: song.coverObjectId,
          });
          coverUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 * 30 });
        } catch {
          // ignore
        }
      }
      
      const defaultLyrics = song.lyrics[0] ?? null;

      return {
        id: song.id,
        title: song.title,
        description: song.description,
        staff: staff ?? [],
        coverUrl,
        audioVersions: song.audioVersions,
        audioDefaultName: song.audioDefaultName,
        lyrics: defaultLyrics?.content ?? null,
      };
    })
  );

  return NextResponse.json({
    language: {
      code: decodedLanguage,
      total,
    },
    songs: songsData,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages,
    },
  });
}
