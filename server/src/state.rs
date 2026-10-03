use std::sync::Arc;

use jsonwebtoken::{DecodingKey, EncodingKey};
use sqlx::PgPool;

use crate::{
    auth::{Hasher, cli_codes::CliCodes, login_limit::LoginLimiter},
    config::Config,
    storage::Storage,
    users::UserCache,
};

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub users: UserCache,
    pub config: Arc<Config>,
    pub jwt: Arc<JwtKeys>,
    pub storage: Storage,
    /// 拉取远程资源用（带 SSRF 防护）
    pub http: reqwest::Client,
    /// 命令行登录的一次性授权码
    pub cli_codes: CliCodes,
    /// 密码哈希：限制并发
    pub hasher: Hasher,
    /// 登录失败计数
    pub login_limit: LoginLimiter,
}

pub struct JwtKeys {
    pub encoding: EncodingKey,
    pub decoding: DecodingKey,
}

impl AppState {
    pub fn new(pool: PgPool, config: Config) -> anyhow::Result<Self> {
        let secret = config.auth_secret.as_bytes();
        Ok(Self {
            users: UserCache::new(pool.clone()),
            jwt: Arc::new(JwtKeys {
                encoding: EncodingKey::from_secret(secret),
                decoding: DecodingKey::from_secret(secret),
            }),
            storage: Storage::new(&config.s3),
            pool,
            config: Arc::new(config),
            http: crate::remote::client()?,
            cli_codes: CliCodes::default(),
            hasher: Hasher::default(),
            login_limit: LoginLimiter::default(),
        })
    }
}
