import { requireAuth } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import UsersManager from "../UsersManager";
import AdminLayout from "../AdminLayout";

export default async function AdminUsersPage() {
  await requireAuth({ permission: PERMISSIONS.ADMIN });

  return (
    <AdminLayout activeTab="users">
      <UsersManager />
    </AdminLayout>
  );
}
