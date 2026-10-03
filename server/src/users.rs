//! 用户信息的进程内缓存（单实例部署，内存中这份即权威）。
//!
//! 不设过期，按需从数据库加载。读未命中与所有写操作都经由 moka 的
//! `and_try_compute_with`，同一 key 上串行执行，避免"读到旧值后覆盖新值"的竞态。
//! 绕过本进程直接改库不会反映到缓存，需重启服务。

use std::{future::Future, sync::Arc};

use chrono::{DateTime, Utc};
use moka::{future::Cache, ops::compute::Op};
use sqlx::PgPool;

use crate::{
    api::{User, UserId},
    auth::Permissions,
    error::AppError,
};

/// 用户账号（不含密码）
#[derive(Debug, Clone)]
pub struct Account {
    pub id: UserId,
    pub email: String,
    pub display_name: String,
    pub permissions: Permissions,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Account {
    pub fn to_api(&self) -> User {
        User {
            id: self.id,
            email: self.email.clone(),
            display_name: self.display_name.clone(),
            permissions: self.permissions.to_list(),
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

/// `SELECT` / `RETURNING` 读出的账号行；`permissions` 是位掩码
pub struct AccountRow {
    pub id: UserId,
    pub email: String,
    pub display_name: String,
    pub permissions: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<AccountRow> for Account {
    fn from(row: AccountRow) -> Self {
        Self {
            id: row.id,
            email: row.email,
            display_name: row.display_name,
            permissions: Permissions::from_bits(row.permissions),
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

#[derive(Clone)]
pub struct UserCache {
    cache: Cache<UserId, Arc<Account>>,
    pool: PgPool,
}

impl UserCache {
    pub fn new(pool: PgPool) -> Self {
        Self {
            cache: Cache::builder().build(),
            pool,
        }
    }

    pub async fn get(&self, id: UserId) -> Result<Option<Arc<Account>>, AppError> {
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

    /// 在该用户的 key 锁内执行数据库写操作，并用其返回值更新缓存（`None` 表示用户已删除或不存在）。
    /// 所有修改用户的接口都必须经由此方法。
    pub async fn write<F, Fut>(&self, id: UserId, f: F) -> Result<Option<Arc<Account>>, AppError>
    where
        F: FnOnce() -> Fut,
        Fut: Future<Output = Result<Option<Account>, AppError>>,
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

async fn load(pool: &PgPool, id: UserId) -> Result<Option<Account>, AppError> {
    let row = sqlx::query_as!(
        AccountRow,
        r#"SELECT id AS "id: UserId", email, display_name, permissions, created_at, updated_at
           FROM users WHERE id = $1"#,
        id as UserId
    )
    .fetch_optional(pool)
    .await?;
    Ok(row.map(Account::from))
}
