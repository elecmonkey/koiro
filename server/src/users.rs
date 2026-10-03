//! 用户信息的进程内缓存（单实例部署，内存中这份即权威）。
//!
//! 不设过期，按需从数据库加载。读未命中与所有写操作都经由 moka 的
//! `and_try_compute_with`，同一 key 上串行执行，避免"读到旧值后覆盖新值"的竞态。
//! 绕过本进程直接改库不会反映到缓存，需重启服务。

use std::{future::Future, sync::Arc};

use moka::{future::Cache, ops::compute::Op};
use serde::Serialize;
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserInfo {
    pub id: Uuid,
    pub email: String,
    pub display_name: String,
    pub permissions: i32,
}

#[derive(Clone)]
pub struct UserCache {
    cache: Cache<Uuid, Arc<UserInfo>>,
    pool: PgPool,
}

impl UserCache {
    pub fn new(pool: PgPool) -> Self {
        Self {
            cache: Cache::builder().build(),
            pool,
        }
    }

    pub async fn get(&self, id: Uuid) -> Result<Option<Arc<UserInfo>>, AppError> {
        if let Some(user) = self.cache.get(&id).await {
            return Ok(Some(user));
        }
        let pool = self.pool.clone();
        let result = self
            .cache
            .entry(id)
            .and_try_compute_with(|entry| async move {
                // 拿到 key 锁时可能已被并发请求填好
                if entry.is_some() {
                    return Ok::<_, AppError>(Op::Nop);
                }
                Ok(match load(&pool, id).await? {
                    Some(user) => Op::Put(Arc::new(user)),
                    None => Op::Nop,
                })
            })
            .await?;
        Ok(result.into_entry().map(|e| e.into_value()))
    }

    /// 在该用户的 key 锁内执行数据库写操作，并用其返回值更新缓存（`None` 表示用户已删除）。
    /// 所有修改用户的接口都必须经由此方法。
    pub async fn write<F, Fut>(&self, id: Uuid, f: F) -> Result<Option<Arc<UserInfo>>, AppError>
    where
        F: FnOnce() -> Fut,
        Fut: Future<Output = Result<Option<UserInfo>, AppError>>,
    {
        let result = self
            .cache
            .entry(id)
            .and_try_compute_with(|_| async move {
                Ok::<_, AppError>(match f().await? {
                    Some(user) => Op::Put(Arc::new(user)),
                    None => Op::Remove,
                })
            })
            .await?;
        Ok(result.into_entry().map(|e| e.into_value()))
    }
}

async fn load(pool: &PgPool, id: Uuid) -> Result<Option<UserInfo>, AppError> {
    let user = sqlx::query_as!(
        UserInfo,
        "SELECT id, email, display_name, permissions FROM users WHERE id = $1",
        id
    )
    .fetch_optional(pool)
    .await?;
    Ok(user)
}
