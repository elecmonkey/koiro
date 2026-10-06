import type { Permission, User, UserId } from './generated/api';

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

/**
 * 能否修改、删除一首歌或一个歌单：有 UPLOAD，并且是创建者或 ADMIN。
 * 与服务端的判断一致（先要求 UPLOAD，再 require_owner_or_admin），界面只用它决定显示什么。
 */
export function canManage(
  user: Pick<User, 'id' | 'permissions'> | null,
  ownerId: UserId | null | undefined,
): boolean {
  if (!user || !hasPermission(user, 'upload')) return false;
  return hasPermission(user, 'admin') || (!!ownerId && user.id === ownerId);
}
