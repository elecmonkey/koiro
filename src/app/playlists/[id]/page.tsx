import { requireAuth } from "@/lib/auth-guard";
import PlaylistDetailClient from "./PlaylistDetailClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PlaylistDetailPage({ params }: PageProps) {
  await requireAuth({ allowAnonymous: true });
  const { id } = await params;

  return <PlaylistDetailClient playlistId={id} />;
}
