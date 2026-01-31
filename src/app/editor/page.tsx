import EditorShell from "./EditorShell";
import { requireAuth } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";

export default async function EditorPage() {
  await requireAuth({ permission: PERMISSIONS.UPLOAD });
  return <EditorShell />;
}
