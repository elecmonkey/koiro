import { requireAuth } from "@/lib/auth-guard";
import { getSiteName } from "@/lib/site-config";
import PlaylistsClient from "./PlaylistsClient";
import type { Metadata } from "next";

const siteName = getSiteName();

export const metadata: Metadata = {
  title: `播放列表 - ${siteName}`,
  description: "浏览所有播放列表",
};

export default async function PlaylistsPage() {
  await requireAuth({ allowAnonymous: true });

  return <PlaylistsClient />;
}
