# Koiro

Koiro 是你的个人音乐库。

## Tech Stack

- React + MUI (Material UI)，Rsbuild 构建
- TypeScript
- Rust (axum + sqlx)
- PostgreSQL
- S3 兼容存储

## Development

```bash
pnpm install
pnpm dev
```

前端端口：3720（`/api` 代理到后端 3721）

环境变量、权限系统、管理命令、仓库结构等技术细节见 [AGENTS.md](./AGENTS.md)。

## License

MIT
