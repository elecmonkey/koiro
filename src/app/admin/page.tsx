import { requireAuth } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import AdminShell from "./AdminShell";

export default async function AdminPage() {
  await requireAuth({ permission: PERMISSIONS.ADMIN });
  return <AdminShell />;
}
