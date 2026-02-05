import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { Block } from "@/app/editor/ast/types";
import { buildPlainText } from "@/app/editor/ast/plainText";

const PAGE_SIZE = 10;

// GET - 获取所有歌曲列表
export async function GET(request: NextRequest) {
  const session = await auth();
  const permissions = session?.user?.permissions ?? 0;
  if (!session?.user || !hasPermission(permissions, PERMISSIONS.ADMIN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const keyword = searchParams.get("q")?.trim();
  const offset = (page - 1) * PAGE_SIZE;

  let songIds: string[] = [];
  let total = 0;

  if (keyword) {
    const like = `%${keyword}%`;
    const countRows = (await prisma.$queryRaw<
      { count: number }[]
    >`SELECT COUNT(*)::int AS count FROM "Song" WHERE "title" ILIKE ${like} OR "description" ILIKE ${like} OR "staff"::text ILIKE ${like}`) as { count: number }[];
    total = countRows[0]?.count ?? 0;

    const idRows = (await prisma.$queryRaw<
      { id: string }[]
    >`SELECT id FROM "Song" WHERE "title" ILIKE ${like} OR "description" ILIKE ${like} OR "staff"::text ILIKE ${like} ORDER BY "updatedAt" DESC LIMIT ${PAGE_SIZE} OFFSET ${offset}`) as { id: string }[];
    songIds = idRows.map((row) => row.id);
  } else {
    total = await prisma.song.count();
    const idRows = await prisma.song.findMany({
      select: { id: true },
      orderBy: { updatedAt: "desc" },
      skip: offset,
      take: PAGE_SIZE,
    });
    songIds = idRows.map((row) => row.id);
  }

  const songs = songIds.length
    ? await prisma.song.findMany({
        where: { id: { in: songIds } },
        include: {
          _count: {
            select: { lyrics: true },
          },
        },
      })
    : [];

  const orderMap = new Map(songIds.map((id, index) => [id, index]));
  songs.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

  return NextResponse.json({
    songs: songs.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      staff: s.staff,
      coverObjectId: s.coverObjectId,
      audioVersions: s.audioVersions,
      audioDefaultName: s.audioDefaultName,
      lyricsCount: s._count.lyrics,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    },
  });
}

type Body = {
  title: string;
  description: string;
  coverObjectId: string | null;
  audioDefaultName: string | null;
  versions: { key: string; objectId: string; isDefault: boolean; lyricsId?: string | null }[];
  staff: { id: string; role: string; name: string | string[] }[];
  lyricsVersions: {
    id: string;
    key: string;
    isDefault: boolean;
    lines: { id: string; startMs: number; endMs?: number; text: string; rubyByIndex?: Record<number, string> }[];
    languages?: string[];
  }[];
  playlistIds?: string[];
};

export async function POST(request: Request) {
  const session = await auth();
  const permissions = session?.user?.permissions ?? 0;
  if (!session?.user || !hasPermission(permissions, PERMISSIONS.UPLOAD)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Body;
  if (!body?.title?.trim()) {
    return NextResponse.json({ error: "歌曲名不能为空" }, { status: 400 });
  }
  if (!body?.coverObjectId) {
    return NextResponse.json({ error: "必须上传封面" }, { status: 400 });
  }
  if (!body?.versions?.length) {
    return NextResponse.json({ error: "必须至少添加一个音频版本" }, { status: 400 });
  }
  if (!body?.audioDefaultName) {
    return NextResponse.json({ error: "必须选择默认音频版本" }, { status: 400 });
  }
  if (body.versions.some((v) => !v.objectId)) {
    return NextResponse.json({ error: "所有音频版本都必须上传" }, { status: 400 });
  }
  if (body.versions.some((v) => !v.key?.trim())) {
    return NextResponse.json({ error: "音频版本名不能为空" }, { status: 400 });
  }

  const audioVersions = body.versions.reduce<Record<string, { objectId: string; lyricsId?: string | null }>>((acc, item) => {
    const name = item.key?.trim();
    if (!name) return acc;
    acc[name] = {
      objectId: item.objectId,
      lyricsId: item.lyricsId ?? null,
    };
    return acc;
  }, {});
  const staff = (body.staff ?? [])
    .map((item) => ({
      role: item.role?.trim(),
      name: Array.isArray(item.name) 
        ? item.name.map((n) => n.trim()).filter(Boolean)
        : item.name?.trim(),
    }))
    .filter((item) => item.role || (Array.isArray(item.name) ? item.name.length > 0 : item.name));

  try {
    const song = await prisma.song.create({
      data: {
        title: body.title.trim(),
        description: body.description?.trim() ?? "",
        staff,
        coverObjectId: body.coverObjectId,
        audioVersions,
        audioDefaultName: body.audioDefaultName,
        lyrics: {
          create: (body.lyricsVersions ?? []).map((lyr) => {
            const blocks = lyr.lines.map((line) => ({
              type: "line" as const,
              time: { startMs: line.startMs, endMs: line.endMs },
              children: buildLineInlines(line.text ?? "", line.rubyByIndex),
            }));
            const content = { 
              type: "doc", 
              meta: { languages: lyr.languages ?? ["ja"] },
              blocks 
            };
            const plainText = buildPlainText(blocks as Block[]);
            return {
              versionKey: lyr.key.trim(),
              isDefault: !!lyr.isDefault,
              format: "KOIRO_AST_V1",
              content,
              plainText,
            };
          }),
        },
        // 关联播放列表
        playlists: body.playlistIds?.length ? {
          create: body.playlistIds.map((playlistId, index) => ({
            playlistId,
            order: index,
          })),
        } : undefined,
      },
    });

    return NextResponse.json({ ok: true, id: song.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "提交失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function buildLineInlines(
  text: string,
  rubyByIndex?: Record<number, string>
): { type: "text" | "ruby"; text?: string; base?: string; ruby?: string }[] {
  if (!text) {
    return [{ type: "text", text: "" }];
  }
  const segments = text.split(/(\/)/);
  let tokenIndex = 0;
  const inlines: { type: "text" | "ruby"; text?: string; base?: string; ruby?: string }[] = [];
  segments.forEach((segment) => {
    if (!segment || segment === "/") return;
    const ruby = rubyByIndex?.[tokenIndex];
    if (ruby) {
      inlines.push({ type: "ruby", base: segment, ruby });
    } else {
      inlines.push({ type: "text", text: segment });
    }
    tokenIndex += 1;
  });
  return inlines;
}
