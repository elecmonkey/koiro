import { test, expect } from '../fixture.ts';
import { ACCOUNTS } from '../fixtures/accounts.ts';
import { login, logout, openAccountMenu } from '../fixtures/actions.ts';

/**
 * 初始数据（node scripts/seed.ts avatar-permissions）：uploaderB 有 view/download/upload
 * 权限、没有头像；admin 是管理员。
 *
 * 完整路径：uploaderB 自己上传头像 → admin 在用户管理里看到这个头像 →
 * admin 收回 uploaderB 的 upload 权限 → uploaderB 再登录时上传入口立刻消失。
 */
test('avatar shows up in admin, and revoking upload permission hides it immediately', async ({
  page,
  aiAssert,
}) => {
  await login(page, ACCOUNTS.uploaderB);
  await page.goto('/profile');
  await aiAssert(
    '个人中心页面的头像目前是昵称首字母的占位图，还没有设置过真实头像',
  );

  await page
    .locator('input[type="file"][accept="image/*"]')
    .setInputFiles('fixtures/cover.png');
  await expect(page.getByText('头像更新成功')).toBeVisible({ timeout: 15_000 });
  // 刻意用棋盘格图案而不是纯色，描述断言时也直接点名这个图案，避免模型纠结
  // "这算不算一张真实头像照片"这种主观判断
  await aiAssert(
    '头像区域现在显示的是一张粉紫相间的棋盘格图案图片，不再是昵称首字母的纯色占位',
  );

  await logout(page);
  await login(page, ACCOUNTS.admin);
  await page.goto('/admin');
  await page.getByPlaceholder('搜索用户').fill(ACCOUNTS.uploaderB.email);
  await page.getByPlaceholder('搜索用户').press('Enter');
  await aiAssert(
    `用户管理列表里「${ACCOUNTS.uploaderB.displayName}」这一行的头像是一张粉紫相间的棋盘格图案图片，不是昵称首字母的纯色占位`,
  );

  await page.getByRole('button', { name: '权限' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByText('上传', { exact: true }).click();
  await dialog.getByRole('button', { name: '保存' }).click();
  await expect(dialog).toBeHidden();
  await aiAssert(
    `「${ACCOUNTS.uploaderB.displayName}」这一行的权限标签里已经没有"上传"了`,
  );

  await logout(page);
  await login(page, ACCOUNTS.uploaderB);
  // 账号菜单是个下拉，得先点开才看得到里面有什么
  await openAccountMenu(page);
  await aiAssert(
    '导航栏右上角的账号下拉菜单已经打开，里面不再有"我的音乐"这一项，因为已经没有上传权限了',
  );
  await page.keyboard.press('Escape');

  await page.goto('/upload');
  await page.waitForURL('/denied');
  // /denied 只是个通用的无权限页面，文案不会说明具体是哪个权限、为什么被收回，
  // 只断言页面上实际会出现的内容
  await aiAssert(
    '当前页面提示账号权限不足，没有显示歌曲、歌单之类需要登录后才能看的内容',
  );
});
