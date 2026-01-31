import { requireAuth } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import SongsManager from "../SongsManager";
import AdminLayout from "../AdminLayout";

export default async function AdminSongsPage() {
  await requireAuth({ permission: PERMISSIONS.ADMIN });

  return (
    <AdminLayout activeTab="songs">
      <SongsManager />
    </AdminLayout>
  );
}
