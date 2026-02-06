import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../packages/db/src/generated/prisma/client";

// 初始化 Prisma 客户端
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

type SongRow = {
  id: string;
  title: string;
};

async function main() {
  const songs = await prisma.song.findMany({
    select: { id: true, title: true },
  });

  const map = new Map<string, SongRow[]>();
  for (const song of songs) {
    const key = song.title.trim();
    const list = map.get(key) ?? [];
    list.push(song);
    map.set(key, list);
  }

  const duplicates = Array.from(map.entries())
    .filter(([, list]) => list.length > 1)
    .map(([title, list]) => ({
      title,
      count: list.length,
      ids: list.map((item) => item.id),
    }))
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));

  if (duplicates.length === 0) {
    console.log("没有发现同名歌曲。");
    return;
  }

  console.log(JSON.stringify(duplicates, null, 2));
}

main()
  .catch((error) => {
    console.error("统计失败:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
