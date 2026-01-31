import { requireAuth } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import HomeClient from "./HomeClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  await requireAuth({ permission: PERMISSIONS.VIEW, allowAnonymous: true });

  return <HomeClient />;
}
