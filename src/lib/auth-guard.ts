import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "./permissions";

const allowAnonymous =
  process.env.KOIRO_ALLOW_ANON === "1" ||
  process.env.KOIRO_ALLOW_ANON === "true";

type RequireAuthOptions = {
  permission?: number;
  allowAnonymous?: boolean;
};

export async function requireAuth(options: RequireAuthOptions = {}) {
  const session = await auth();
  const isAnonymousAllowed = options.allowAnonymous ?? allowAnonymous;

  if (!session?.user) {
    if (options.permission && isAnonymousAllowed) {
      return null;
    }
    if (isAnonymousAllowed) {
      return null;
    }
    redirect("/login");
  }

  const permissions = session?.user?.permissions ?? 0;

  if (permissions === 0) {
    redirect("/denied");
  }

  if (options.permission && !hasPermission(permissions, options.permission)) {
    redirect("/denied");
  }

  return session;
}
