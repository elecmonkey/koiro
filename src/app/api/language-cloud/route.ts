import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PERMISSIONS, checkApiPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type LanguageEntry = {
  language: string;
  count: number;
};

export async function GET() {
  const session = await auth();
  const permissions = session?.user?.permissions;
  if (!checkApiPermission(permissions, PERMISSIONS.VIEW, true)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 获取所有歌曲及其歌词
  const songs = await prisma.song.findMany({
    select: {
      id: true,
      lyrics: {
        select: {
          content: true,
        },
      },
    },
  });

  const languageMap = new Map<string, Set<string>>();

  // 遍历每首歌曲，收集其所有歌词版本的语种
  for (const song of songs) {
    const songLanguages = new Set<string>();
    
    for (const lyr of song.lyrics) {
      const content = lyr.content as { meta?: { languages?: string[] } };
      const languages = content?.meta?.languages ?? [];
      
      for (const lang of languages) {
        if (lang && typeof lang === "string") {
          songLanguages.add(lang);
        }
      }
    }

    // 为这首歌的每个语种增加计数
    for (const lang of songLanguages) {
      if (!languageMap.has(lang)) {
        languageMap.set(lang, new Set());
      }
      languageMap.get(lang)!.add(song.id);
    }
  }

  // 构建结果数组
  const languages: LanguageEntry[] = Array.from(languageMap.entries())
    .map(([language, songIds]) => ({
      language,
      count: songIds.size,
    }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({ languages });
}
