import type { Page } from '@playwright/test';

type Account = { email: string; password: string };

/** 登录表单字段固定、文案稳定，直接用原生定位更快更稳，AI 留给真正需要判断的步骤 */
export async function login(page: Page, account: Account) {
  await page.goto('/login');
  await page.getByLabel('邮箱').fill(account.email);
  await page.getByLabel('密码').fill(account.password);
  await page.getByRole('button', { name: '登录' }).click();
  await page.waitForURL('/');
  // 紧跟在一次导航后面调用 Midscene 的第一次 aiXxx 会报 "Execution context was
  // destroyed"（它在当时那个 execution context 上挂了点东西，被导航打断），之后
  // 整个测试里的截图就都不对了；在第一次用 AI 之前，先让网络彻底静下来再交给它
  await page.waitForLoadState('networkidle');
}

/** 导航栏右上角的账号入口：无障碍名称是"{头像字母} 你好，{昵称}"，头像字母在前面，不能用 `^` 锚定 */
export async function openAccountMenu(page: Page) {
  await page.getByRole('button', { name: /你好，/ }).click();
}

export async function logout(page: Page) {
  await openAccountMenu(page);
  await page.getByRole('menuitem', { name: '退出登录' }).click();
  // 用得到登录表单本身来判断，不用 waitForURL：这个环境下跑了几个 aiAssert 之后，
  // URL 变化事件似乎不总能被等到，即便页面其实已经真的跳到 /login 了
  await page
    .getByRole('button', { name: '登录' })
    .waitFor({ state: 'visible' });
}
