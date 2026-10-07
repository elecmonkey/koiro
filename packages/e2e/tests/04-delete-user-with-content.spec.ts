import { test, expect } from '../fixture.ts';
import { ACCOUNTS } from '../fixtures/accounts.ts';
import { login } from '../fixtures/actions.ts';

/**
 * 初始数据（node scripts/seed.ts delete-user-with-content）：
 * uploaderB 名下有一首「种子曲目：B 的孤品」，admin 是管理员。
 *
 * 完整路径：admin 直接删 uploaderB 失败（还有歌，后端 409）→ 读到报错文案 →
 * 删掉那首歌 → 再删用户就能成功。这是本次会话加的"不能删有内容的用户"这条约束
 * 从后端状态码到真实页面文案、可闭环操作的端到端验证。
 */
test('deleting a user who still owns a song is blocked until the song is gone', async ({
  page,
  aiAssert,
}) => {
  await login(page, ACCOUNTS.admin);
  await page.goto('/admin');
  await page.getByPlaceholder('搜索用户').fill(ACCOUNTS.uploaderB.email);
  await page.getByPlaceholder('搜索用户').press('Enter');

  await page.getByRole('button', { name: '删除' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '删除' }).click();
  await aiAssert(
    `弹窗里出现了删除失败的报错提示，大意是「${ACCOUNTS.uploaderB.displayName}」还有自己创建的歌曲或歌单，需要先转移或删除`,
  );
  await page.getByRole('dialog').getByRole('button', { name: '取消' }).click();
  await aiAssert(
    `用户列表里「${ACCOUNTS.uploaderB.displayName}」仍然在，删除并没有真的发生`,
  );

  // 清空这个用户名下的内容：去"我的音乐"（ADMIN 在这里看到的是全站歌曲）删掉那首歌
  await page.goto('/mine/songs');
  await page.getByPlaceholder('搜索歌曲').fill('种子曲目：B 的孤品');
  await page.getByPlaceholder('搜索歌曲').press('Enter');
  await page.getByRole('button', { name: '删除' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '删除' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await aiAssert('歌曲已经从列表里消失，说明删除成功');

  await page.goto('/admin');
  await page.getByPlaceholder('搜索用户').fill(ACCOUNTS.uploaderB.email);
  await page.getByPlaceholder('搜索用户').press('Enter');
  await page.getByRole('button', { name: '删除' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '删除' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await aiAssert(
    `用户列表里已经没有「${ACCOUNTS.uploaderB.displayName}」了，这次删除成功了`,
  );
});
