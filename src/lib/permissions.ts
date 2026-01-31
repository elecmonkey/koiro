export const PERMISSIONS = {
  VIEW: 1,
  DOWNLOAD: 2,
  UPLOAD: 4,
  ADMIN: 8,
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

// 全局配置：是否开放匿名访问（默认不开放）
const globalAllowAnonymous =
  process.env.KOIRO_ALLOW_ANON === "1" ||
  process.env.KOIRO_ALLOW_ANON === "true";

export function hasPermission(mask: number, permission: number) {
  return (mask & permission) === permission;
}

/**
 * 检查 API 请求是否有权限
 * @param userPermissions 用户权限值（未登录时为 0 或 undefined）
 * @param requiredPermission 所需权限
 * @param allowAnonymous 该 API 是否可以匿名访问（仅当全局开放匿名访问时生效）
 */
export function checkApiPermission(
  userPermissions: number | undefined,
  requiredPermission: number,
  allowAnonymous: boolean = false
): boolean {
  const permissions = userPermissions ?? 0;
  
  // 如果全局开放匿名访问，且该 API 允许匿名访问浏览权限的内容
  if (globalAllowAnonymous && allowAnonymous && requiredPermission === PERMISSIONS.VIEW) {
    return true;
  }
  
  // 否则检查用户实际权限
  return hasPermission(permissions, requiredPermission);
}
