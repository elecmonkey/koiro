import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../packages/db/src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

type AudioVersionValue = string | { objectId: string; lyricsId?: string | null };

async function main() {
  const songs = await prisma.song.findMany({
    select: {
      id: true,
      title: true,
      audioVersions: true,
      audioDefaultName: true,
    },
  });

  const missing = songs
    .map((song) => {
      const audioVersions = (song.audioVersions ?? {}) as Record<string, AudioVersionValue>;
      const defaultName = song.audioDefaultName?.trim() || null;
      if (!defaultName) {
        return { id: song.id, title: song.title, reason: "missing_default_audio_name" };
      }
      const value = audioVersions[defaultName];
      if (!value) {
        return { id: song.id, title: song.title, reason: "default_audio_not_found" };
      }
      if (typeof value === "string") {
        return { id: song.id, title: song.title, reason: "legacy_audio_without_lyrics" };
      }
      if (!value.lyricsId) {
        return { id: song.id, title: song.title, reason: "default_audio_missing_lyrics" };
      }
      return null;
    })
    .filter(Boolean);

  if (missing.length === 0) {
    console.log("所有主音频都已绑定歌词。");
    return;
  }

  console.log(JSON.stringify(missing, null, 2));
}

main()
  .catch((error) => {
    console.error("统计失败:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
