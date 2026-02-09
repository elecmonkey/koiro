import type { Metadata } from "next";
import { getSiteName } from "@/lib/site-config";
import { requireAuth } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import LanguageCloudClient from "./LanguageCloudClient";

const siteName = getSiteName();

export const metadata: Metadata = {
  title: `语种云 - ${siteName}`,
  description: "按歌曲数量统计的语种词云",
};

export default async function LanguageCloudPage() {
  await requireAuth({ permission: PERMISSIONS.VIEW });
  return <LanguageCloudClient />;
}
