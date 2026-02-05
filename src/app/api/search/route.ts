import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PERMISSIONS, checkApiPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { GetObjectCommand, getSignedUrl, s3Client } from "@/lib/s3";

// 搜索权重配置
const WEIGHTS = {
  title: 100,      // 标题匹配最高优先
  staff: 50,       // Staff 值匹配
  lyrics: 20,      // 歌词内容匹配
};

type SearchResult = {
  id: string;
  title: string;
  description: string | null;
  staff: { role: string; name: string | string[] }[];
  coverObjectId: string | null;
  coverUrl?: string | null;
  score: number;
  matchType: ("title" | "staff" | "lyrics")[];
  matchSnippet?: string;
  titleHighlights?: { text: string; highlight?: boolean }[];
  staffHighlights?: { role: string; name: { text: string; highlight?: boolean }[] }[];
  matchSnippetHighlights?: { text: string; highlight?: boolean }[];
};

// GET - 搜索歌曲
export async function GET(request: NextRequest) {
  const session = await auth();
  const permissions = session?.user?.permissions;
  if (!checkApiPermission(permissions, PERMISSIONS.VIEW, true)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("q")?.trim().toLowerCase();
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

  if (!keyword) {
    return NextResponse.json({ results: [], total: 0, page, pageSize });
  }

  // 获取所有歌曲及其歌词
  const songs = await prisma.song.findMany({
    include: {
      lyrics: {
        select: {
          plainText: true,
          versionKey: true,
        },
      },
    },
  });

  // 计算每首歌的搜索得分
  const scoredResults: SearchResult[] = [];

  for (const song of songs) {
    let score = 0;
    const matchType: ("title" | "staff" | "lyrics")[] = [];
    let matchSnippet: string | undefined;
    let matchSnippetHighlights: { text: string; highlight?: boolean }[] | undefined;
    let titleHighlights: { text: string; highlight?: boolean }[] | undefined;
    let staffHighlights: { role: string; name: { text: string; highlight?: boolean }[] }[] | undefined;

    // 1. 标题匹配
    const titleLower = song.title.toLowerCase();
    if (titleLower.includes(keyword)) {
      score += WEIGHTS.title;
      // 完全匹配额外加分
      if (titleLower === keyword) {
        score += WEIGHTS.title * 0.5;
      }
      // 开头匹配额外加分
      if (titleLower.startsWith(keyword)) {
        score += WEIGHTS.title * 0.3;
      }
      matchType.push("title");
      titleHighlights = buildHighlights(song.title, keyword);
    }

    // 2. Staff 值匹配（只匹配 name，不匹配 role 键）
    const staffArray = song.staff as { role: string; name: string | string[] }[] | null;
    if (staffArray && Array.isArray(staffArray)) {
      for (const item of staffArray) {
        const names = Array.isArray(item.name) ? item.name : [item.name || ""];
        for (const name of names) {
          const nameLower = name.toLowerCase();
          if (nameLower.includes(keyword)) {
            score += WEIGHTS.staff;
            // 完全匹配额外加分
            if (nameLower === keyword) {
              score += WEIGHTS.staff * 0.5;
            }
            matchType.push("staff");
            if (!matchSnippet) {
              matchSnippet = `${item.role}: ${name}`;
              matchSnippetHighlights = buildHighlights(matchSnippet, keyword);
            }
            break; // 每首歌只计算一次 staff 匹配
          }
        }
        if (matchType.includes("staff")) break;
      }
      staffHighlights = staffArray.map((item) => ({
        role: item.role,
        name: buildHighlights(
          Array.isArray(item.name) ? item.name.join("、") : item.name || "",
          keyword
        ),
      }));
    }

    // 3. 歌词内容匹配
    for (const lyr of song.lyrics) {
      const plainTextLower = (lyr.plainText || "").toLowerCase();
      if (plainTextLower.includes(keyword)) {
        score += WEIGHTS.lyrics;
        if (!matchType.includes("lyrics")) {
          matchType.push("lyrics");
        }
        // 提取匹配片段作为摘要
        if (!matchSnippet || !matchType.includes("staff")) {
          const index = plainTextLower.indexOf(keyword);
          const start = Math.max(0, index - 15);
          const end = Math.min(lyr.plainText.length, index + keyword.length + 15);
          const snippet = lyr.plainText.slice(start, end);
          matchSnippet = (start > 0 ? "..." : "") + snippet + (end < lyr.plainText.length ? "..." : "");
          matchSnippetHighlights = buildHighlights(matchSnippet, keyword);
        }
        break; // 每首歌只计算一次歌词匹配
      }
    }

    // 只有匹配的才加入结果
    if (score > 0) {
      scoredResults.push({
        id: song.id,
        title: song.title,
        description: song.description,
        staff: (staffArray || []) as { role: string; name: string | string[] }[],
        coverObjectId: song.coverObjectId,
        score,
        matchType,
        matchSnippet,
        titleHighlights,
        staffHighlights,
        matchSnippetHighlights,
      });
    }
  }

  // 按分数排序
  scoredResults.sort((a, b) => b.score - a.score);

  // 分页
  const total = scoredResults.length;
  const startIndex = (page - 1) * pageSize;
  const paginatedResults = scoredResults.slice(startIndex, startIndex + pageSize);

  const resultsWithCovers = await Promise.all(
    paginatedResults.map(async (item) => ({
      ...item,
      coverUrl: item.coverObjectId ? await signObjectUrl(item.coverObjectId) : null,
    }))
  );

  return NextResponse.json({
    results: resultsWithCovers,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

function buildHighlights(text: string, keyword: string) {
  if (!text) return [{ text: "" }];
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  if (!lowerKeyword || !lowerText.includes(lowerKeyword)) {
    return [{ text }];
  }

  const segments: { text: string; highlight?: boolean }[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const index = lowerText.indexOf(lowerKeyword, cursor);
    if (index === -1) {
      segments.push({ text: text.slice(cursor) });
      break;
    }
    if (index > cursor) {
      segments.push({ text: text.slice(cursor, index) });
    }
    segments.push({ text: text.slice(index, index + lowerKeyword.length), highlight: true });
    cursor = index + lowerKeyword.length;
  }
  return segments;
}

async function signObjectUrl(objectId: string) {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_ENDPOINT === "true" ? process.env.S3_ENDPOINT : process.env.S3_BUCKET,
    Key: objectId,
  });
  return getSignedUrl(s3Client, command, { expiresIn: 60 * 5 });
}
