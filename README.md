# Koiro

Koiro 是你的个人音乐库。

## Tech Stack
- Next.js (App Router)
- MUI (Material UI)
- TypeScript
- Prisma (PostgreSQL)
- S3 兼容存储

## 环境变量

### 必需

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL 数据库连接字符串 | `postgresql://user:pass@localhost:5432/koiro` |
| `AUTH_SECRET` | Auth.js 会话加密密钥（可用 `pnpm auth:secret` 生成） | 随机字符串 |
| `S3_ENDPOINT` | S3 兼容存储端点 | `https://s3.amazonaws.com` |
| `S3_REGION` | S3 区域 | `us-east-1` |
| `S3_ACCESS_KEY_ID` | S3 访问密钥 ID | - |
| `S3_SECRET_ACCESS_KEY` | S3 访问密钥 | - |
| `S3_BUCKET` | S3 存储桶名称（`S3_BUCKET_ENDPOINT=true` 时可选） | `my-bucket` |

### 可选

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `S3_BUCKET_ENDPOINT` | 是否使用桶端点模式（如 Cloudflare R2） | `false` |
| `S3_PREFIX` | S3 对象键前缀 | `""` |
| `KOIRO_ALLOW_ANON` | 是否开放匿名访问（`1` 或 `true` 开启） | `false` |

### S3 配置说明

**标准模式**（如 AWS S3）：
- 设置 `S3_BUCKET` 为存储桶名称
- `S3_BUCKET_ENDPOINT` 留空或设为 `false`

**桶端点模式**（如 Cloudflare R2）：
- 设置 `S3_BUCKET_ENDPOINT=true`
- `S3_ENDPOINT` 设为包含桶名的完整端点
- `S3_BUCKET` 可省略

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
pnpm dev
```
默认端口：3720

## Auth

生成 Auth.js 密钥：

```bash
pnpm auth:secret
```

## Build
```bash
pnpm build
pnpm start
```

## License
MIT
