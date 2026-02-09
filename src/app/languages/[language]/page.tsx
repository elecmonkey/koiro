import type { Metadata } from "next";
import { getSiteName } from "@/lib/site-config";
import { requireAuth } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import LanguageDetailClient from "./LanguageDetailClient";

type Params = {
  params: Promise<{ language: string }>;
};

const siteName = getSiteName();

import { getLanguageName } from "@/lib/languages";

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { language } = await params;
  const decoded = decodeURIComponent(language);
  const displayName = getLanguageName(decoded);
  return {
    title: `${displayName} - ${siteName}`,
    description: `${displayName}语种的歌曲`,
  };
}

export default async function LanguageDetailPage({ params }: Params) {
  await requireAuth({ permission: PERMISSIONS.VIEW });
  const { language } = await params;
  return <LanguageDetailClient language={language} />;
}
