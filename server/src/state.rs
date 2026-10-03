use std::sync::Arc;

use jsonwebtoken::{DecodingKey, EncodingKey};
use sqlx::PgPool;

use crate::{config::Config, storage::Storage, users::UserCache};

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub users: UserCache,
    pub config: Arc<Config>,
    pub jwt: Arc<JwtKeys>,
    pub storage: Storage,
    /// 拉取远程资源用（带 SSRF 防护）
    pub http: reqwest::Client,
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
        })
    }
}
