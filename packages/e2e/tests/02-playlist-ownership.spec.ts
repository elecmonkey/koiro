import { test, expect } from '../fixture.ts';
import { ACCOUNTS } from '../fixtures/accounts.ts';
import { login, logout } from '../fixtures/actions.ts';

/**
 * 初始数据（node scripts/seed.ts playlist-ownership）：
 * uploaderA 名下已有「种子曲目一」「种子曲目二」两首歌，uploaderB 是干净的陪衬账号。
 *
 * 完整路径：建歌单 → 把两首歌加进去 → 在公开详情页确认归属 UI →
 * 换成不是创建者的账号直接访问管理地址，确认会被弹回只读页（这是本次会话修的那个
 * 「/mine/playlists/:id 缺归属检查」的真实浏览器回归测试）。
 */
test('create a playlist, add songs, and enforce ownership on the manage page', async ({
  page,
  aiAssert,
}) => {
  const name = `E2E 歌单 ${Date.now()}`;

  await login(page, ACCOUNTS.uploaderA);
  await page.goto('/mine/playlists');
  await page.getByRole('button', { name: '新建播放列表' }).click();
  await page.getByLabel('播放列表名称').fill(name);
  await page.getByLabel('简介').fill('Midscene E2E 测试生成的歌单');
  await page
    .locator('input[type="file"][accept="image/*"]')
    .setInputFiles('fixtures/cover.png');
  await page.getByRole('button', { name: '上传封面' }).click();
  await expect(page.getByText('已上传').first()).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole('button', { name: '创建' }).click();

  await expect(page.getByText(name)).toBeVisible();
  await aiAssert(
    `刚建的播放列表「${name}」出现在"我的歌单"列表里，显示 0 首歌`,
  );

  // 种子数据没有预置任何歌单，刚建的这个是"我的歌单"里唯一一条，直接点它的"管理"
  await page.getByRole('link', { name: '管理' }).click();
  await page.waitForURL(/\/mine\/playlists\/[0-9a-f-]+$/);
  const playlistId = page.url().split('/').pop();

  for (const title of ['种子曲目一', '种子曲目二']) {
    await page.getByRole('button', { name: '添加歌曲' }).click();
    await page.getByLabel('搜索歌曲').fill(title);
    await page.getByRole('option', { name: title }).click();
    await page.getByRole('button', { name: '添加' }).click();
    await expect(page.getByText('已添加歌曲')).toBeVisible();
  }
  await aiAssert('歌曲列表标题旁边的数字是 2，下面列出了两首种子歌曲');

  await page.goto(`/playlists/${playlistId}`);
  // 归属信息在页面最下方，封面虽然不大但加上歌曲列表仍可能超出首屏——跟歌曲详情页
  // 一样，Midscene 的截图只看当前视口，断言前先滚到底
  await page.keyboard.press('End');
  await aiAssert(
    `当前是播放列表「${name}」的公开详情页，底部归属信息显示的创建者是「${ACCOUNTS.uploaderA.displayName}」，并且有"编辑"按钮`,
  );

  await logout(page);
  await login(page, ACCOUNTS.uploaderB);
  await page.goto(`/mine/playlists/${playlistId}`);
  await page.waitForURL(`/playlists/${playlistId}`);
  await page.keyboard.press('End');
  // 只断言页面上能看到的事实（不是管理页、没有编辑按钮），原因留在上面的代码注释里，
  // 不交给模型去验证"为什么"——它看不到谁是创建者这件事背后的逻辑，只能看画面
  await aiAssert(
    `当前显示的是播放列表「${name}」的只读公开详情页，不是管理页面，也看不到"编辑"按钮`,
  );
});
