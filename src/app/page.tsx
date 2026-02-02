import { requireAuth } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { getSiteName } from "@/lib/site-config";
import HomeClient from "./HomeClient";
import type { Metadata } from "next";

const siteName = getSiteName();

export const metadata: Metadata = {
  title: siteName,
  description: "音乐歌词管理平台",
};

export const dynamic = "force-dynamic";

export default async function Home() {
  await requireAuth({ permission: PERMISSIONS.VIEW, allowAnonymous: true });

  return <HomeClient />;
}
