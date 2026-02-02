import { requireAuth } from "@/lib/auth-guard";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSiteName } from "@/lib/site-config";
import PlaylistDetailClient from "./PlaylistDetailClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const siteName = getSiteName();
  
  const playlist = await prisma.playlist.findUnique({
    where: { id },
    select: { name: true, description: true },
  });

  if (!playlist) {
    return { title: `播放列表 - ${siteName}` };
  }

  return {
    title: `${playlist.name} - ${siteName}`,
    description: playlist.description || `浏览播放列表 ${playlist.name}`,
  };
}

export default async function PlaylistDetailPage({ params }: PageProps) {
  await requireAuth({ allowAnonymous: true });
  const { id } = await params;

  return <PlaylistDetailClient playlistId={id} />;
}
