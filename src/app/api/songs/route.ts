import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { Block } from "@/app/editor/ast/types";
import { buildPlainText } from "@/app/editor/ast/plainText";

type Body = {
  title: string;
  description: string;
  coverObjectId: string | null;
  audioDefaultName: string | null;
  versions: { key: string; objectId: string; isDefault: boolean }[];
  staff: { id: string; role: string; name: string }[];
  lyricsVersions: {
    id: string;
    key: string;
    isDefault: boolean;
    lines: { id: string; startMs: number; endMs?: number; text: string; rubyByIndex?: Record<number, string> }[];
  }[];
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

  const audioVersions = body.versions.reduce<Record<string, string>>((acc, item) => {
    const name = item.key?.trim();
    if (!name) return acc;
    acc[name] = item.objectId;
    return acc;
  }, {});
  const staff = (body.staff ?? [])
    .map((item) => ({
      role: item.role?.trim(),
      name: item.name?.trim(),
    }))
    .filter((item) => item.role || item.name);

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
            const content = { type: "doc", blocks };
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
