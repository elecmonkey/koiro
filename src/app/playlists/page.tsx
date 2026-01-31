import { requireAuth } from "@/lib/auth-guard";
import PlaylistsClient from "./PlaylistsClient";

export default async function PlaylistsPage() {
  await requireAuth({ allowAnonymous: true });

  return <PlaylistsClient />;
}
