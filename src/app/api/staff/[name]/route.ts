import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PERMISSIONS, checkApiPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { GetObjectCommand, getSignedUrl, s3Client } from "@/lib/s3";

const PAGE_SIZE = 10;

type RouteParams = {
  params: Promise<{ name: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  const permissions = session?.user?.permissions;
  if (!checkApiPermission(permissions, PERMISSIONS.VIEW, true)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name: rawName } = await params;
  const staffName = decodeURIComponent(rawName);
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

  const songs = await prisma.song.findMany({
    select: { id: true, staff: true },
  });

  const matchedIds = new Set<string>();
  const roleCounts = new Map<string, number>();

  for (const song of songs) {
    const staffArray = song.staff as { role?: string; name?: string | string[] }[] | null;
    if (!staffArray || !Array.isArray(staffArray)) continue;
    for (const item of staffArray) {
      const role = (item.role || "").trim();
      const names = Array.isArray(item.name) ? item.name : [item.name || ""];
      for (const raw of names) {
        const name = (raw || "").trim();
        if (!name) continue;
        if (name !== staffName) continue;
        matchedIds.add(song.id);
        if (role) {
          roleCounts.set(role, (roleCounts.get(role) || 0) + 1);
        }
      }
    }
  }

  const total = matchedIds.size;
  if (total === 0) {
    return NextResponse.json({ error: "Staff 不存在" }, { status: 404 });
  }

  const songList = await prisma.song.findMany({
    where: { id: { in: Array.from(matchedIds) } },
    orderBy: { updatedAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      lyrics: {
        where: { isDefault: true },
        take: 1,
      },
    },
  });

  const songsWithCover = await Promise.all(
    songList.map(async (s) => {
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
        staff: s.staff as { role: string; name: string | string[] }[],
        coverUrl,
        audioVersions: s.audioVersions as Record<string, string> | null,
        lyrics: s.lyrics?.[0]?.content ?? null,
      };
    })
  );

  const roles = Array.from(roleCounts.entries())
    .map(([role, count]) => ({ role, count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    staff: {
      name: staffName,
      total,
      roles,
    },
    songs: songsWithCover,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    },
  });
}
