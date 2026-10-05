# Web 前端架构

本文档描述 `web/src` 的分层与约定，写新代码前先看这里该放到哪一层。

## 分层与依赖方向

```
http/  →  api/  →  query/  →  stores/ / pages/ / components/
```

依赖只能单向向右，禁止反向或跨层直接依赖（例如组件里直接 `fetch` 或导入 `api/`）。

- **`http/`**：唯一的网络层。`client.ts` 的 `request<T>()` 是唯一发 JSON 请求、做类型断言（`as T`）的地方；`api-error.ts` 定义 `ApiError`；`upload.ts` 提供基于 XHR 的文件上传（带进度回调），不使用 axios。
- **`api/`**：每个接口对应一个手写函数，按资源分文件（`songs.ts`、`playlists.ts`、`users.ts`、`browse.ts`、`auth.ts`、`uploads.ts`、`audio.ts`）。函数签名直接用 `@koiro/shared` 生成的类型，不做运行时校验（不用 zod，类型安全完全来自 Rust 生成的类型）。
- **`query/`**：TanStack Query 封装。`keys.ts` 集中管理所有 `queryKey`，查询和失效必须都从这里取 key，不能各写各的。`invalidate.ts` 的 `invalidateCatalog()` 统一失效歌曲/歌单/staff/语言/搜索这组关联数据。每个资源一个文件导出该资源的 `useXxx` 查询与 mutation hook。
- **`stores/`**：纯客户端状态，不涉及服务端数据获取（当前有 `player.tsx` 播放器状态、`upload-draft.ts` 上传草稿的本地存储）。
- **`pages/`**：一个路由一个文件，目录结构和 URL 路径一一对应（例如 `pages/songs/detail.tsx` 对应 `/songs/:id`，`pages/admin/playlists/index.tsx` 对应 `/admin/playlists`）。页面只做轻量编排：取 query hook 的数据、用 `PageState` 处理 loading/error/empty，把数据传给 `components/`。页面不内联业务逻辑或大段 JSX。
- **`components/`**：按业务域分组（`song/`、`playlist/`、`user/`、`admin/`、`song-form/`、`lyrics-editor/`、`upload/`、`player/`、`profile/`、`layout/`、`ui/`）。组件之间允许同域内互相引用，但不跨层访问 `http/`、`api/`，只通过 `query/` 拿数据。`ui/` 放纯展示、不绑定具体业务的通用组件（如 `page-state.tsx`、`page-header.tsx`）。

## 命名与导出约定

- 文件名统一 kebab-case。
- `components/` 下的组件用具名导出（`export function Xxx`），不用 `export default`。
- `pages/` 下的页面保留 `export default`，这是 React Router `lazy()` 懒加载约定要求的。
- 新增接口的流程固定为：Rust 端定义类型/路由 → `packages/shared` 生成类型 → `api/` 写一个手写函数 → `query/` 包一层 hook（写在对应资源文件里，`keys.ts` 加对应 key）→ 页面或组件里用 hook。中间任何一层都不能跳过。
