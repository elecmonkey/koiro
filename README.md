# Koiro

Koiro 是你的个人音乐库。

## Tech Stack

- React + MUI (Material UI)，Rsbuild 构建
- TypeScript
- Rust (axum + sqlx)
- PostgreSQL
- S3 兼容存储

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

### 权限系统

用户权限使用位掩码：

- `VIEW (1)` - 浏览歌曲和歌单
- `DOWNLOAD (2)` - 下载音频文件
- `UPLOAD (4)` - 上传新歌曲
- `ADMIN (8)` - 管理员权限

权限可叠加，如 `15` = 全部权限，`3` = 浏览+下载。

当 `KOIRO_ALLOW_ANON=true` 时，未登录用户可访问 VIEW 级别的内容。

## Development

```bash
pnpm install
pnpm dev
```

前端端口：3720（`/api` 代理到后端 3721）

## 管理命令

```bash
koiro-server migrate                  # 数据库迁移
koiro-server user add                 # 添加用户
koiro-server user passwd <email>      # 重设密码
koiro-server songs duplicates         # 查找同名歌曲
koiro-server songs missing-lyrics     # 查找缺歌词的歌曲
koiro-server storage backfill         # 补齐对象缓存头
koiro-server storage orphans          # 列出无引用的对象
```

## Build

```bash
pnpm --filter @koiro/web build          # 前端 → web/dist
cargo build --release -p koiro-server   # 后端 → target/release/koiro-server
```

## License

MIT
