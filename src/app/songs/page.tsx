import { requireAuth } from "@/lib/auth-guard";
import { getSiteName } from "@/lib/site-config";
import SongsClient from "./SongsClient";
import type { Metadata } from "next";

const siteName = getSiteName();

export const metadata: Metadata = {
  title: `歌曲列表 - ${siteName}`,
  description: "浏览所有歌曲",
};

export default async function SongsPage() {
  await requireAuth({ allowAnonymous: true });

  return <SongsClient />;
}
