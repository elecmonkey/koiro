import { test, expect } from '../fixture.ts';
import { ACCOUNTS } from '../fixtures/accounts.ts';
import { login } from '../fixtures/actions.ts';

/**
 * 初始数据（node scripts/seed.ts create-song）：uploaderA 账号，0 首歌、0 歌单。
 *
 * 完整路径：登录 → 上传一首新歌（封面 + 音频走真实的对象存储）→ 落在详情页 →
 * 「我的音乐」列表能看到 → 公开搜索也能搜到。
 */
test('upload a new song end to end', async ({ page, aiAssert, aiQuery }) => {
  const title = `E2E 新歌 ${Date.now()}`;

  await login(page, ACCOUNTS.uploaderA);
  await aiAssert(
    `导航栏右上角显示"你好，${ACCOUNTS.uploaderA.displayName}"，说明已登录成功`,
  );

  await page.goto('/upload');
  await page.getByLabel('歌曲名').fill(title);
  await page.getByLabel('简介').fill('Midscene E2E 测试生成的歌曲');

  // 新建表单自带两行 staff 模板（作词、演唱），单人模式下就是一个"姓名"输入框，
  // 名字必填才能提交，不需要再新增一行
  await page.getByLabel('姓名').first().fill('E2E 作词人');
  await page.getByLabel('姓名').last().fill('E2E 虚拟歌手');

  // 封面：真实走 POST /uploads/images，后端按文件头校验格式
  await page
    .locator('input[type="file"][accept="image/*"]')
    .setInputFiles('fixtures/cover.png');
  await page.getByRole('button', { name: '上传封面' }).click();
  await expect(page.getByText('已上传').first()).toBeVisible({
    timeout: 15_000,
  });

  // 音频：真实走预签名 URL 直传对象存储
  await page
    .locator('input[type="file"][accept="audio/*"]')
    .setInputFiles('fixtures/audio.mp3');
  await page.getByRole('button', { name: '上传音频' }).click();
  await expect(page.getByText('已上传').last()).toBeVisible({
    timeout: 15_000,
  });
  // 只有一个音频版本，确保它被标记为默认（已是默认时点一下也无副作用）
  await page.getByRole('button', { name: '默认', exact: true }).click();

  await page.getByRole('button', { name: '提交上传' }).click();
  await page.waitForURL(/\/songs\/[0-9a-f-]+$/, { timeout: 20_000 });
  await page.waitForLoadState('networkidle');

  // 封面是正方形大图，首屏经常只看得到封面、标题在下面——Midscene 的截图只看当前
  // 视口（跟人眼第一眼看到的一样，不会自动滚动），滚到标题再断言，不然会被判定"空白"
  await page.getByRole('heading', { name: title }).scrollIntoViewIfNeeded();
  await aiAssert(`当前页面是歌曲「${title}」的详情页，标题正确显示`);

  // 归属信息在页面最下方，同理先滚过去
  await page.keyboard.press('End');
  await aiAssert(
    '页面底部的归属信息显示的是当前登录用户，并且有"编辑"按钮，因为这首歌是自己上传的',
  );

  await page.goto('/mine/songs');
  await page
    .getByText(title)
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 });
  const mineTitles = await aiQuery<string[]>(
    '页面里歌曲列表中每一行的标题文字组成的数组',
  );
  expect(mineTitles).toContain(title);

  await page.goto(`/search?q=${encodeURIComponent(title)}`);
  await page
    .getByText(title)
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 });
  await aiAssert(`搜索结果里出现了标题为「${title}」的歌曲`);
});
