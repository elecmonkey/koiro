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

  const rows = (await prisma.$queryRaw`
    SELECT id, title, description, staff, "coverObjectId", "audioVersions"
    FROM "Song"
    ORDER BY random()
    LIMIT ${limit}
  `) as {
    id: string;
    title: string;
    description: string;
    staff: { role: string; name: string }[] | null;
    coverObjectId: string | null;
    audioVersions: Record<string, string> | null;
  }[];

  const songs = await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      title: row.title,
      description: row.description ?? "",
      staff: row.staff ?? [],
      audioVersions: row.audioVersions ?? {},
      coverUrl: row.coverObjectId ? await signObjectUrl(row.coverObjectId) : null,
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
