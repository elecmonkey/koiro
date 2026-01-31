import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { Block } from "@/app/editor/ast/types";
import { buildPlainText } from "@/app/editor/ast/plainText";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET - 获取单个歌曲详情（管理用，含完整歌词内容）
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
        content: l.content,
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
  staff?: { id?: string; role: string; name: string }[];
  coverObjectId?: string | null;
  coverFilename?: string | null;
  audioDefaultName?: string | null;
  versions?: { id?: string; key: string; objectId: string; isDefault: boolean }[];
  lyricsVersions?: {
    id: string;
    key: string;
    isDefault: boolean;
    lines: { id: string; startMs: number; endMs?: number; text: string; rubyByIndex?: Record<number, string> }[];
  }[];
};

// PUT - 更新歌曲（完整更新，包括歌词）
export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const session = await auth();
  const permissions = session?.user?.permissions ?? 0;
  if (!session?.user || !hasPermission(permissions, PERMISSIONS.ADMIN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as UpdateSongBody;

  const existing = await prisma.song.findUnique({ 
    where: { id },
    include: { lyrics: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "歌曲不存在" }, { status: 404 });
  }

  // 构建音频版本对象
  let audioVersions = existing.audioVersions as Record<string, string>;
  if (body.versions !== undefined) {
    audioVersions = body.versions.reduce<Record<string, string>>((acc, item) => {
      const name = item.key?.trim();
      if (!name) return acc;
      acc[name] = item.objectId;
      return acc;
    }, {});
  }

  // 处理 staff
  let staffData: { role: string; name: string }[] | undefined;
  if (body.staff !== undefined) {
    staffData = body.staff
      .map((item) => ({
        role: item.role?.trim() ?? "",
        name: item.name?.trim() ?? "",
      }))
      .filter((item) => item.role || item.name);
  }

  // 更新歌曲主体
  const song = await prisma.song.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title.trim() }),
      ...(body.description !== undefined && { description: body.description }),
      ...(staffData !== undefined && { staff: staffData }),
      ...(body.coverObjectId !== undefined && { coverObjectId: body.coverObjectId }),
      audioVersions,
      ...(body.audioDefaultName !== undefined && { audioDefaultName: body.audioDefaultName }),
    },
  });

  // 处理歌词版本：删除旧的，创建新的
  if (body.lyricsVersions !== undefined) {
    // 删除所有旧歌词
    await prisma.lyricsDocument.deleteMany({ where: { songId: id } });
    
    // 创建新歌词
    for (const lyrVer of body.lyricsVersions) {
      const blocks = lyrVer.lines.map((line) => ({
        type: "line" as const,
        time: { startMs: line.startMs, endMs: line.endMs },
        children: buildLineInlines(line.text ?? "", line.rubyByIndex),
      }));
      const content = { type: "doc", blocks };
      const plainText = buildPlainText(blocks as Block[]);
      await prisma.lyricsDocument.create({
        data: {
          songId: id,
          versionKey: lyrVer.key?.trim() || "未命名",
          isDefault: lyrVer.isDefault,
          format: "KOIRO_AST_V1",
          content,
          plainText,
        },
      });
    }
  }

  return NextResponse.json({ ok: true, id: song.id });
}

// 构建行内元素
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
