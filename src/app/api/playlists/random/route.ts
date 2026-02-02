import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PERMISSIONS, checkApiPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { GetObjectCommand, getSignedUrl, s3Client } from "@/lib/s3";

// GET - 获取随机播放列表
export async function GET() {
  const session = await auth();
  const permissions = session?.user?.permissions;
  if (!checkApiPermission(permissions, PERMISSIONS.VIEW, true)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = 4;

  const rows = (await prisma.$queryRaw`
    SELECT p.id, p.name, p.description, p."coverObjectId", COUNT(sp."songId")::int as "songCount"
    FROM "Playlist" p
    LEFT JOIN "SongPlaylist" sp ON p.id = sp."playlistId"
    GROUP BY p.id
    ORDER BY random()
    LIMIT ${limit}
  `) as {
    id: string;
    name: string;
    description: string;
    coverObjectId: string | null;
    songCount: number;
  }[];

  const playlists = await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      songCount: row.songCount,
      coverUrl: row.coverObjectId ? await signObjectUrl(row.coverObjectId) : null,
    }))
  );

  return NextResponse.json({ playlists });
}

async function signObjectUrl(objectId: string) {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_ENDPOINT === "true" ? process.env.S3_ENDPOINT : process.env.S3_BUCKET,
    Key: objectId,
  });
  return getSignedUrl(s3Client, command, { expiresIn: 60 * 5 });
}
