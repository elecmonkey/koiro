# Koiro

Koiro 是一个个人音乐库：后端用 Rust 管理歌曲、歌词、歌单、用户和对象存储，前端是一个 React SPA，另外有一个命令行工具和一个给 AI agent 用的 skill。仓库是 pnpm workspace + Cargo workspace 的混合单仓。

## 仓库结构

顶层只放两个独立部署的服务，其余都是被它们依赖或打包进去的子包，统一放在 `packages/` 下：

```
server/                Rust 后端（axum + sqlx + PostgreSQL + S3），部署为一个二进制服务
web/                    前端 SPA（React + MUI，Rsbuild 构建），部署为静态站点

packages/shared/        前后端共享的 TypeScript 类型与工具（含生成代码）
packages/cli/           命令行工具 @koiro/cli，面向终端用户和 skill 脚本，直接分发给用户
packages/skill/         Claude Code 的 Agent Skill：koiro-agent，脚本化操作用户自己的数据，直接分发给用户
packages/installer/     把 packages/skill 连同 packages/cli 的构建产物打包成 .tgz，供 web 端下载安装；本身不单独分发
```

`docs.local/` 是本地私人笔记，已在 `.gitignore` 里排除，不代表仓库的权威信息，不要依赖它。

## 接口契约：唯一来源在 Rust 端

`server/src/api/` 下的类型是前后端交换数据的唯一定义来源。`cargo test` 运行时 ts-rs 会把这些类型导出成 `packages/shared/src/generated/api.ts`，`web/` 和 `packages/cli/` 都从 `@koiro/shared` 引用这些类型，不另行手写或用 zod 之类的库做运行时校验。

改动接口字段的流程固定是：改 `server/src/api/` 里的类型 → `cargo test` 重新生成 → 下游（`web/src/api/`、`packages/cli/`）跟着改。不要手改 `packages/shared/src/generated/api.ts`，它是生成产物。

## 后端（server/）

- axum 处理路由（`src/routes/`），sqlx 连 PostgreSQL，S3 兼容对象存储放音频和封面图片。
- 鉴权是无状态 JWT（只含 `sub` 和 `exp`），不用服务端 session，权限查询在进程内缓存。
- 校验：`cargo clippy --all-targets -- -D warnings && cargo fmt --check`（即 `pnpm --filter @koiro/server check`）。

### 权限系统

用户权限使用位掩码，可叠加：

| 权限       | 值  | 说明           |
| ---------- | --- | -------------- |
| `VIEW`     | 1   | 浏览歌曲和歌单 |
| `DOWNLOAD` | 2   | 下载音频文件   |
| `UPLOAD`   | 4   | 上传新歌曲     |
| `ADMIN`    | 8   | 管理员权限     |

例如 `15` = 全部权限，`3` = 浏览+下载。`KOIRO_ALLOW_ANON=true` 时，未登录用户可访问 `VIEW` 级别的内容。

### 内嵌管理命令

`src/cli/` 是内嵌在同一个二进制里的管理子命令，通过 `koiro-server <子命令>` 调用，和根目录的 `pnpm` 脚本是两套东西：

```bash
koiro-server migrate                  # 数据库迁移
koiro-server user add                 # 添加用户
koiro-server user passwd <email>      # 重设密码
koiro-server songs duplicates         # 查找同名歌曲
koiro-server songs missing-lyrics     # 查找缺歌词的歌曲
koiro-server storage backfill         # 补齐对象缓存头
koiro-server storage orphans          # 列出无引用的对象
```

## 前端（web/）

分层固定为单向依赖，写新代码前先确认该放哪一层，禁止跨层（比如组件里直接 `fetch` 或导入 `api/`）：

```
http/  →  api/  →  query/  →  stores/ / pages/ / components/
```

- **`http/`**：唯一的网络层。`client.ts` 的 `request<T>()` 是唯一发请求、做类型断言（`as T`）的地方；`upload.ts` 用 XHR 实现带进度的文件上传，不用 axios。
- **`api/`**：每个接口一个手写函数，按资源分文件，直接用 `@koiro/shared` 的生成类型，不做运行时校验。
- **`query/`**：TanStack Query 封装。`keys.ts` 集中管理所有 `queryKey`，查询和失效都从这里取 key；失效一组关联数据统一走 `invalidate.ts` 的 `invalidateCatalog()`，不要各处分别 invalidate。
- **`stores/`**：纯客户端状态（播放器、上传草稿本地存储），不涉及服务端数据获取。
- **`pages/`**：一个路由一个文件，目录结构和 URL 路径一一对应。页面只做轻量编排——取 query hook 数据、用 `PageState` 处理 loading/error/empty、把数据传给组件，不内联业务逻辑或大段 JSX。
- **`components/`**：按业务域分组（`song/`、`playlist/`、`user/`、`admin/`、`song-form/`、`lyrics-editor/`、`upload/`、`player/`、`profile/`、`staff/`、`layout/`、`ui/`）。只通过 `query/` 拿数据，不直接访问 `http/`、`api/`。`ui/` 放不绑定具体业务的通用展示组件。

命名约定：文件名统一 kebab-case；`components/` 下用具名导出（`export function Xxx`）；`pages/` 下保留 `export default`（React Router `lazy()` 要求）。

校验：根目录跑 `pnpm exec rs check --type-check`（lint+格式+类型检查都在这一条，必须在仓库根目录跑，`web/` 目录下没有完整的 lint 配置）。

## packages/ 下的子包

- `packages/cli/` 是给终端用户和 `packages/skill/koiro-agent` 脚本用的命令行客户端，直接用 `@koiro/shared` 的类型和 HTTP 调后端，不经过 `web/` 的任何一层。构建产物（`koiro.mjs`）直接输出到 `packages/skill/koiro-agent/scripts/`，随 skill 一起分发。
- `packages/skill/` 是 Agent Skill 本体（`SKILL.md` + 上面提到的 CLI 脚本），`packages/installer/` 把它打包成 `.tgz`，`web/` 构建时再把这个 `.tgz` 拷进站点供下载安装。改 `packages/cli/` 或 `packages/skill/` 后要记得跑一遍 `packages/installer` 的 build 才能让下载包更新。
- `packages/shared/` 除了生成的接口类型，还有歌词解析（`lyrics.ts`）、语言列表（`languages.ts`）、权限位掩码（`permissions.ts`）等前后端通用逻辑；这些是手写的，和 `generated/` 区分开。

## 环境变量

### 必需

| 变量名                 | 说明                                                              | 示例                                          |
| ---------------------- | ----------------------------------------------------------------- | --------------------------------------------- |
| `DATABASE_URL`         | PostgreSQL 数据库连接字符串                                       | `postgresql://user:pass@localhost:5432/koiro` |
| `AUTH_SECRET`          | JWT 签名密钥，至少 32 字符（可用 `openssl rand -base64 32` 生成） | 随机字符串                                    |
| `S3_ENDPOINT`          | S3 兼容存储端点                                                   | `https://s3.example.com`                      |
| `S3_REGION`            | S3 区域                                                           | `us-east-1`                                   |
| `S3_ACCESS_KEY_ID`     | S3 访问密钥 ID                                                    | -                                             |
| `S3_SECRET_ACCESS_KEY` | S3 访问密钥                                                       | -                                             |
| `S3_BUCKET`            | S3 存储桶名称                                                     | `my-bucket`                                   |
| `S3_PUBLIC_URL`        | 公开读对象（封面图片）的访问前缀，可为绑定到桶的自定义域名        | `https://s3.example.com`                      |

### 可选

| 变量名                | 说明                                                      | 默认值           |
| --------------------- | --------------------------------------------------------- | ---------------- |
| `S3_PREFIX`           | S3 对象键前缀                                             | `""`             |
| `S3_FORCE_PATH_STYLE` | 是否使用 path-style 地址（如 MinIO）                      | `false`          |
| `KOIRO_ALLOW_ANON`    | 是否开放匿名访问（`1` 或 `true` 开启）                    | `false`          |
| `KOIRO_BIND`          | 后端监听地址                                              | `127.0.0.1:3721` |
| `KOIRO_COOKIE_SECURE` | 登录 cookie 是否带 Secure（本地 http 调试时设为 `false`） | `true`           |

### S3 配置说明

- 签名请求（音频上传、播放、下载）走 `S3_ENDPOINT` + `S3_BUCKET`
- `<S3_PREFIX>img/*` 需设为公开读，封面直接用 `S3_PUBLIC_URL` 拼接地址
- 音频由浏览器直传，存储桶的 CORS 需允许站点域名的 PUT

## 常用命令

```bash
pnpm install && pnpm dev          # 前端 3720（/api 代理到后端 3721），后端另起
pnpm --filter @koiro/web build    # 前端 → web/dist
cargo build --release -p koiro-server   # 后端 → target/release/koiro-server
pnpm exec rs check --type-check   # 前端 lint + 格式 + 类型检查（根目录执行）
pnpm --filter @koiro/server check # 后端 clippy + fmt 检查
pnpm -r test                      # 跑全部包的测试
```
