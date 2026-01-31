import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "./permissions";

// 全局配置：是否开放匿名访问（默认不开放）
const globalAllowAnonymous =
  process.env.KOIRO_ALLOW_ANON === "1" ||
  process.env.KOIRO_ALLOW_ANON === "true";

type RequireAuthOptions = {
  permission?: number;
  /** 该页面是否可以匿名访问（仅当全局 KOIRO_ALLOW_ANON 开启时生效） */
  allowAnonymous?: boolean;
};

export async function requireAuth(options: RequireAuthOptions = {}) {
  const session = await auth();
  
  // 只有全局开放匿名访问时，页面级别的 allowAnonymous 才生效
  // 如果全局不开放匿名访问，则无论页面怎么设置都必须登录
  const isAnonymousAllowed = globalAllowAnonymous && (options.allowAnonymous ?? true);

  if (!session?.user) {
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
