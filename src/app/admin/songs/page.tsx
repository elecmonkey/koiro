import { requireAuth } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { getSiteName } from "@/lib/site-config";
import type { Metadata } from "next";
import SongsManager from "../SongsManager";
import AdminLayout from "../AdminLayout";

const siteName = getSiteName();

export const metadata: Metadata = {
  title: `歌曲管理 - ${siteName}`,
  description: "系统管理面板",
};

export default async function AdminSongsPage() {
  await requireAuth({ permission: PERMISSIONS.ADMIN });

  return (
    <AdminLayout activeTab="songs">
      <SongsManager />
    </AdminLayout>
  );
}
