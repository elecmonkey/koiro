import { requireAuth } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { getSiteName } from "@/lib/site-config";
import UploadFormClient from "./UploadFormClient";
import type { Metadata } from "next";

const siteName = getSiteName();

export const metadata: Metadata = {
  title: `上传歌曲 - ${siteName}`,
  description: "上传新的歌曲和歌词",
};

export default async function UploadPage() {
  await requireAuth({ permission: PERMISSIONS.UPLOAD });
  return <UploadFormClient />;
}
