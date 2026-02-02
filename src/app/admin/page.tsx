import { requireAuth } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { getSiteName } from "@/lib/site-config";
import PlaylistsManager from "./PlaylistsManager";
import AdminLayout from "./AdminLayout";
import type { Metadata } from "next";

const siteName = getSiteName();

export const metadata: Metadata = {
  title: `管理后台 - ${siteName}`,
  description: "系统管理面板",
};

export default async function AdminPage() {
  await requireAuth({ permission: PERMISSIONS.ADMIN });

  return (
    <AdminLayout activeTab="playlists">
      <PlaylistsManager />
    </AdminLayout>
  );
}
