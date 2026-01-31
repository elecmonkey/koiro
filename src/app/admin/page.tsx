import { requireAuth } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import PlaylistsManager from "./PlaylistsManager";
import AdminLayout from "./AdminLayout";

export default async function AdminPage() {
  await requireAuth({ permission: PERMISSIONS.ADMIN });

  return (
    <AdminLayout activeTab="playlists">
      <PlaylistsManager />
    </AdminLayout>
  );
}
