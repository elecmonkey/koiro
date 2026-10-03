use anyhow::{Context, bail};

#[derive(Debug, Clone)]
pub struct Config {
    /// 监听地址，默认 127.0.0.1:3721（前面由 Caddy 反代）
    pub bind: String,
    pub database_url: String,
    /// JWT 签名密钥；更换即令所有登录失效
    pub auth_secret: String,
    /// 是否允许未登录用户以 VIEW 权限浏览
    pub allow_anonymous: bool,
    /// 会话 cookie 是否带 Secure；本地 http 调试时可设 KOIRO_COOKIE_SECURE=false
    pub cookie_secure: bool,
    pub s3: S3Config,
}

#[derive(Debug, Clone)]
pub struct S3Config {
    /// 服务端点，如 https://s3.example.com
    pub endpoint: String,
    pub region: String,
    pub bucket: String,
    pub access_key_id: String,
    pub secret_access_key: String,
    /// 默认 false（virtual-hosted 风格：https://<bucket>.<endpoint host>/<key>）
    pub force_path_style: bool,
    /// 对象 key 前缀，如 koiro/
    pub prefix: String,
    /// 公开读对象的 URL 前缀（可为绑定到桶的自定义域名），key 直接拼在其后
    pub public_url: String,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        let auth_secret = required("AUTH_SECRET")?;
        if auth_secret.len() < 32 {
            bail!("AUTH_SECRET must be at least 32 characters");
        }
        Ok(Self {
            bind: optional("KOIRO_BIND").unwrap_or_else(|| "127.0.0.1:3721".into()),
            database_url: required("DATABASE_URL")?,
            auth_secret,
            allow_anonymous: flag("KOIRO_ALLOW_ANON").unwrap_or(false),
            cookie_secure: flag("KOIRO_COOKIE_SECURE").unwrap_or(true),
            s3: S3Config {
                endpoint: required("S3_ENDPOINT")?,
                region: required("S3_REGION")?,
                bucket: required("S3_BUCKET")?,
                access_key_id: required("S3_ACCESS_KEY_ID")?,
                secret_access_key: required("S3_SECRET_ACCESS_KEY")?,
                force_path_style: flag("S3_FORCE_PATH_STYLE").unwrap_or(false),
                prefix: optional("S3_PREFIX").unwrap_or_default(),
                public_url: required("S3_PUBLIC_URL")?,
            },
        })
    }
}

fn optional(key: &str) -> Option<String> {
    std::env::var(key).ok().filter(|v| !v.trim().is_empty())
}

fn required(key: &str) -> anyhow::Result<String> {
    optional(key).with_context(|| format!("{key} is not set"))
}

fn flag(key: &str) -> Option<bool> {
    optional(key).map(|v| matches!(v.trim(), "1" | "true"))
}
