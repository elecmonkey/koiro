import { requireAuth } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import UploadFormClient from "./UploadFormClient";

export default async function UploadPage() {
  await requireAuth({ permission: PERMISSIONS.UPLOAD });
  return <UploadFormClient />;
}
