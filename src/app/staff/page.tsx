import type { Metadata } from "next";
import { getSiteName } from "@/lib/site-config";
import { requireAuth } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import StaffCloudClient from "./StaffCloudClient";

const siteName = getSiteName();

export const metadata: Metadata = {
  title: `Staff 云 - ${siteName}`,
  description: "按出现次数统计的 Staff 词云",
};

export default async function StaffCloudPage() {
  await requireAuth({ permission: PERMISSIONS.VIEW });
  return <StaffCloudClient />;
}
