# Koiro

Koiro 是一个个人音乐库：后端用 Rust 管理歌曲、歌词、歌单、用户和对象存储，前端是一个 React SPA，另外有一个命令行工具和一个给 AI agent 用的 skill。仓库是 pnpm workspace + Cargo workspace 的混合单仓。

## 仓库结构

```
server/            Rust 后端（axum + sqlx + PostgreSQL + S3）
web/                前端 SPA（React + MUI，Rsbuild 构建）
cli/                命令行工具 @koiro/cli，面向终端用户和 skill 脚本
packages/shared/    前后端共享的 TypeScript 类型与工具（含生成代码）
installer/          把 skill 打包成 .tgz 供 web 端下载安装
skill/              Claude Code 的 Agent Skill：koiro-agent，脚本化操作用户自己的数据
```

`docs.local/` 是本地私人笔记，已在 `.gitignore` 里排除，不代表仓库的权威信息，不要依赖它。

## 接口契约：唯一来源在 Rust 端

`server/src/api/` 下的类型是前后端交换数据的唯一定义来源。`cargo test` 运行时 ts-rs 会把这些类型导出成 `packages/shared/src/generated/api.ts`，`web/` 和 `cli/` 都从 `@koiro/shared` 引用这些类型，不另行手写或用 zod 之类的库做运行时校验。

改动接口字段的流程固定是：改 `server/src/api/` 里的类型 → `cargo test` 重新生成 → 下游（`web/src/api/`、`cli/`）跟着改。不要手改 `packages/shared/src/generated/api.ts`，它是生成产物。

## 后端（server/）

- axum 处理路由（`src/routes/`），sqlx 连 PostgreSQL，S3 兼容对象存储放音频和封面图片。
- 鉴权是无状态 JWT（只含 `sub` 和 `exp`），权限用位掩码叠加：`VIEW(1)` `DOWNLOAD(2)` `UPLOAD(4)` `ADMIN(8)`；不用服务端 session，权限查询在进程内缓存。
- `src/cli/` 是内嵌在同一个二进制里的管理子命令（migrate、建用户、查重、查孤儿对象等），通过 `koiro-server <子命令>` 调用，和根目录的 `pnpm` 脚本是两套东西。
- 校验：`cargo clippy --all-targets -- -D warnings && cargo fmt --check`（即 `pnpm --filter @koiro/server check`）。

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
- **`components/`**：按业务域分组（`song/`、`playlist/`、`user/`、`admin/`、`song-form/`、`lyrics-editor/`、`upload/`、`player/`、`profile/`、`layout/`、`ui/`）。只通过 `query/` 拿数据，不直接访问 `http/`、`api/`。`ui/` 放不绑定具体业务的通用展示组件。

命名约定：文件名统一 kebab-case；`components/` 下用具名导出（`export function Xxx`）；`pages/` 下保留 `export default`（React Router `lazy()` 要求）。

校验：根目录跑 `pnpm exec rs check --type-check`（lint+格式+类型检查都在这一条，必须在仓库根目录跑，`web/` 目录下没有完整的 lint 配置）。

## cli/ 和 packages/shared/

- `cli/` 是给终端用户和 `skill/koiro-agent` 脚本用的命令行客户端，直接用 `@koiro/shared` 的类型和 HTTP 调后端，不经过 `web/` 的任何一层。
- `packages/shared/` 除了生成的接口类型，还有歌词解析（`lyrics.ts`）、语言列表（`languages.ts`）、权限位掩码（`permissions.ts`）等前后端通用逻辑；这些是手写的，和 `generated/` 区分开。

## 常用命令

```bash
pnpm install && pnpm dev          # 前端 3720（/api 代理到后端 3721），后端另起
pnpm --filter @koiro/web build    # 前端 → web/dist
cargo build --release -p koiro-server   # 后端 → target/release/koiro-server
pnpm exec rs check --type-check   # 前端 lint + 格式 + 类型检查（根目录执行）
pnpm --filter @koiro/server check # 后端 clippy + fmt 检查
pnpm -r test                      # 跑全部包的测试
```

环境变量、权限位掩码细节、S3 配置说明见根目录 `README.md`。
