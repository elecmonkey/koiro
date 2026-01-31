import { requireAuth } from "@/lib/auth-guard";
import SongsClient from "./SongsClient";

export default async function SongsPage() {
  await requireAuth({ allowAnonymous: true });

  return <SongsClient />;
}
