# @koiro/e2e

用 [Midscene](https://midscenejs.com) + Playwright 跑的几条完整用户路径，走真实的浏览器、真实的
`koiro-server`、真实的 Postgres 和 S3（用 LocalStack 模拟），断言用自然语言描述的 UI 状态，而不是查 DOM 选择器。

**不在 CI 里跑**：每次调用都要花真的 AI 调用（用的是火山引擎的豆包），而且全套依赖（数据库、对象存储、
后端、前端）都要手动起，只适合本地手动验证几条关键路径，或者怀疑某个改动影响了真实用户操作时专门跑一下。

## 和 `server/tests/` 的区别

- `server/tests/`（`#[sqlx::test]` + `tower::oneshot`）直接打 Router，不经过浏览器，测的是后端路由层的
  权限边界和数据契约，跑得快，进 CI。
- 这里测的是同样的功能在**真实页面上**是否也对——按钮在不在、文案对不对、跳转对不对、不同身份登录看到的
  是不是该看到的那个状态。两者不重复，各自测不同的层。

## 一次性准备

你平时开发大概率已经用默认端口（3721 后端、3720 前端）起着一套 `koiro-server` + `web`，连着真实的开发/
生产库。E2E 绝对不能跟这套抢端口或抢库，所以从头到尾都用另一组端口、另一套数据库/对象存储：

```bash
# 1. 起一次性的 Postgres + LocalStack（S3 模拟，只给这套 E2E 用，和开发/生产库完全隔离）
docker compose up -d

# 2. 给 E2E 专用的 koiro-server 用这份环境变量（已经把 KOIRO_BIND 换成 3799，不会跟你平时的
#    开发服务器抢端口；千万别覆盖仓库根目录给开发/生产用的 .env，也别对着它 source）
cp .env.server.example .env.e2e
set -a; source .env.e2e; set +a
cargo run -p koiro-server   # 监听 127.0.0.1:3799

# 3. 另开一个终端，起"第二份" web dev server，代理到上面这个 3799，监听在 3722
#    （不是你平时 pnpm dev 那一份——那份继续连着你真正的开发环境，不用管它）
KOIRO_WEB_PORT=3722 KOIRO_API_PROXY=http://127.0.0.1:3799 pnpm --filter @koiro/web dev

# 4. 安装这个包的依赖和 Playwright 的浏览器
pnpm install
pnpm --filter @koiro/e2e exec playwright install chromium

# 5. 配置 Midscene 用的模型（火山引擎 / 豆包，或其他 OpenAI 兼容端点）
export MIDSCENE_MODEL_API_KEY=...
export MIDSCENE_MODEL_BASE_URL=...
export MIDSCENE_MODEL_NAME=...
export MIDSCENE_MODEL_FAMILY=...
```

默认配置本身是"零入侵"的：没设 `KOIRO_WEB_PORT`/`KOIRO_API_PROXY` 时 `pnpm --filter @koiro/web dev`
行为和一直以来完全一样（3720 代理到 3721），这两个变量只在专门起第二份服务给 E2E 用的时候才需要。

浏览器默认不是无头模式（`playwright.config.ts` 里 `headless: false`），跑的时候能看到真实窗口，
Midscene 和原生 Playwright 的每一步操作都能肉眼跟着看。

## 每次跑之前：重置数据

每条 spec 对应一个种子场景，跑之前手动 seed 一次（会清空整个测试库重新灌数据，不会影响任何其他库）：

```bash
cd packages/e2e
DATABASE_URL=postgresql://koiro:koiro@localhost:5434/koiro node scripts/seed.ts create-song
pnpm exec playwright test tests/01-create-song.spec.ts

DATABASE_URL=postgresql://koiro:koiro@localhost:5434/koiro node scripts/seed.ts playlist-ownership
pnpm exec playwright test tests/02-playlist-ownership.spec.ts

DATABASE_URL=postgresql://koiro:koiro@localhost:5434/koiro node scripts/seed.ts avatar-permissions
pnpm exec playwright test tests/03-avatar-and-permissions.spec.ts

DATABASE_URL=postgresql://koiro:koiro@localhost:5434/koiro node scripts/seed.ts delete-user-with-content
pnpm exec playwright test tests/04-delete-user-with-content.spec.ts
```

账号固定在 `fixtures/accounts.ts` 里（uploaderA / uploaderB / admin），种子脚本每次都建同样的三个号，
密码哈希用 Node 的 `crypto.scryptSync` 生成，和 `server/src/auth/password.rs` 的格式兼容，走真实的登录表单。

## 四条路径

1. **`01-create-song`**：登录 → 填写并提交一首新歌（封面经后端校验、音频真实直传对象存储）→ 落在详情页 →
   「我的音乐」列表、公开搜索都能找到。
2. **`02-playlist-ownership`**：建歌单 → 把两首种子歌曲加进去 → 公开详情页确认归属展示正确 →
   换成不是创建者的账号直接访问管理地址，确认会被弹回只读页（这条顺带回归测试了这次会话修的
   `/mine/playlists/:id` 缺归属检查那个 bug）。
3. **`03-avatar-and-permissions`**：自己上传头像 → 管理员在用户列表里确认看得到 → 管理员收回其
   upload 权限 → 当事人重新登录后，上传入口和 `/upload` 的访问权限立刻消失。
4. **`04-delete-user-with-content`**：管理员删除一个还有歌的用户，先失败并读到报错文案 → 删掉那首歌 →
   再删用户，这次成功。验证的是后端那条"不能删有内容的用户"的约束在真实页面上闭环、文案友好。

## 写新 spec 时的约定（都是踩出来的）

- 能用稳定文本/label 原生定位的（表单字段、确定会出现的按钮）用 Playwright 原生 API，快且确定；
  `aiAssert`/`aiQuery` 留给真正需要"看懂页面状态"的断言，别为了用 AI 而用 AI。
- 文件选择必须用 `locator('input[type=file]').setInputFiles(...)`，AI 点不开系统级的文件选择框。
- 封面图片的 fixture（`fixtures/cover.png`）是真实、可被后端 `images::detect` 识别的 8x8 棋盘格
  PNG（两种颜色交替）。不能用纯色块：拉伸铺满头像、大封面这类区域后，纯色块和"没设置过、显示占位色块"
  视觉上几乎没区别，Midscene 会把真实上传的图判成"还是占位图"；棋盘格一看就是"一张图"，不会和 UI
  本身的占位色混淆。同理也不能用透明像素，会被判成"页面是空的"。音频（`fixtures/audio.mp3`）内容
  不会被服务端校验，占位字节即可。
- **Midscene 的截图只看当前视口**，跟人眼第一眼看到的一样，不会自动滚动。歌曲详情页封面是撑满宽度的
  正方形大图，标题、归属信息这些经常被挤到首屏以外；断言这类内容前先 `scrollIntoViewIfNeeded()` 或
  `page.keyboard.press('End')` 滚过去，不然会被判定成"页面是空的"。
- 账号菜单、权限选择这类需要先点开的下拉/弹层，断言它的内容前记得真的点开——没点开自然什么都看不到。
- 用 `getByRole('button', { name: 'X' })` 这种精确匹配前，留意页面上是不是正好有另一个文字以 X 开头/
  包含 X 的按钮（比如"默认"和"默认版本"），需要的话加 `exact: true`。
- `getByText(...)` 偶尔会匹配到 `<title>` 标签的文字（页面标题，不是正文），`.toBeVisible()` 不一定能
  拦住——更保险的是用 `getByRole('heading', {...})` 之类定位真正的正文元素。
- 断言的措辞避免让模型做主观判断，比如"是不是一张真实头像照片"——用来测试的图本来就是张棋盘格，不是
  真照片，模型会纠结半天给出误判。直接在断言里点名 fixture 实际的样子（"粉紫相间的棋盘格图案"），
  把判断题变成"图案对不对"这种客观题。
