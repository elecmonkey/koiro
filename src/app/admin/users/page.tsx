import { requireAuth } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { getSiteName } from "@/lib/site-config";
import type { Metadata } from "next";
import UsersManager from "../UsersManager";
import AdminLayout from "../AdminLayout";

const siteName = getSiteName();

export const metadata: Metadata = {
  title: `用户管理 - ${siteName}`,
  description: "系统管理面板",
};

export default async function AdminUsersPage() {
  await requireAuth({ permission: PERMISSIONS.ADMIN });

  return (
    <AdminLayout activeTab="users">
      <UsersManager />
    </AdminLayout>
  );
}
