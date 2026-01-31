export const PERMISSIONS = {
  VIEW: 1,
  DOWNLOAD: 2,
  UPLOAD: 4,
  ADMIN: 8,
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export function hasPermission(mask: number, permission: number) {
  return (mask & permission) === permission;
}
