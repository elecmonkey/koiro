/** 固定的测试账号：种子脚本建的号，和每条 spec 登录用的号是同一份 */
export const ACCOUNTS = {
  /** 主角：本节点大多数操作的发起者 */
  uploaderA: {
    email: 'owner-a@e2e.koiro.test',
    password: 'owner-a-password',
    displayName: 'E2E 歌单主理人',
  },
  /** 陪衬：验证"不是我的东西我碰不了" */
  uploaderB: {
    email: 'owner-b@e2e.koiro.test',
    password: 'owner-b-password',
    displayName: 'E2E 路人',
  },
  admin: {
    email: 'admin@e2e.koiro.test',
    password: 'admin-password-123',
    displayName: 'E2E 管理员',
  },
} as const;
