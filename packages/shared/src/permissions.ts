import type { Permission, User } from './generated/api';

/** 权限的说明，顺序即界面上的顺序；键必须恰好覆盖服务端定义的全部权限 */
export const PERMISSIONS = {
  view: '浏览',
  download: '下载',
  upload: '上传',
  admin: '管理',
} as const satisfies Record<Permission, string>;

export function hasPermission(
  user: Pick<User, 'permissions'>,
  permission: Permission,
): boolean {
  return user.permissions.includes(permission);
}
