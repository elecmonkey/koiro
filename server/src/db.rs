use std::{collections::HashSet, time::Duration};

use anyhow::{Context, bail};
use sqlx::{PgPool, migrate::Migrator, postgres::PgPoolOptions};

pub static MIGRATOR: Migrator = sqlx::migrate!();

pub async fn connect(url: &str) -> anyhow::Result<PgPool> {
    PgPoolOptions::new()
        .max_connections(8)
        // 空闲时不保留连接，尽量减少闲置占用
        .min_connections(0)
        .idle_timeout(Duration::from_secs(300))
        .connect(url)
        .await
        .context("failed to connect to database")
}

/// 启动时只检查、不自动迁移：有未执行的 migration 就拒绝启动，需显式运行 `koiro-server migrate`
pub async fn ensure_migrated(pool: &PgPool) -> anyhow::Result<()> {
    let table_exists: bool = sqlx::query_scalar("SELECT to_regclass('_sqlx_migrations') IS NOT NULL")
        .fetch_one(pool)
        .await?;
    let applied: HashSet<i64> = if table_exists {
        sqlx::query_scalar("SELECT version FROM _sqlx_migrations WHERE success")
            .fetch_all(pool)
            .await?
            .into_iter()
            .collect()
    } else {
        HashSet::new()
    };

    let pending: Vec<String> = MIGRATOR
        .iter()
        .filter(|m| m.migration_type.is_up_migration() && !applied.contains(&m.version))
        .map(|m| format!("{} {}", m.version, m.description))
        .collect();
    if !pending.is_empty() {
        bail!(
            "database has pending migrations: {}; run `koiro-server migrate` first",
            pending.join(", ")
        );
    }
    Ok(())
}
