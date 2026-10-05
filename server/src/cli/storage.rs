use std::collections::HashSet;

use clap::Subcommand;
use sqlx::PgPool;

use crate::storage::{AUDIO_CACHE_CONTROL, IMAGE_CACHE_CONTROL, Storage};

#[derive(Subcommand)]
pub enum StorageCommand {
    /// 给已有对象补 Cache-Control（可重复执行）
    Backfill {
        /// 只打印将要做的事
        #[arg(long)]
        dry_run: bool,
    },
    /// 列出数据库中已无引用的对象（换下的封面、删除歌曲留下的音频等）
    Orphans {
        /// 同时删除这些对象
        #[arg(long)]
        delete: bool,
    },
    /// 删除指定对象
    Rm { keys: Vec<String> },
}

pub async fn run(command: StorageCommand, storage: &Storage, pool: &PgPool) -> anyhow::Result<()> {
    match command {
        StorageCommand::Backfill { dry_run } => backfill(storage, dry_run).await,
        StorageCommand::Orphans { delete } => orphans(storage, pool, delete).await,
        StorageCommand::Rm { keys } => {
            for key in keys {
                storage.delete(&key).await?;
                println!("deleted {key}");
            }
            Ok(())
        }
    }
}

async fn backfill(storage: &Storage, dry_run: bool) -> anyhow::Result<()> {
    let mut updated = 0;
    for (folder, cache_control) in [("img", IMAGE_CACHE_CONTROL), ("music", AUDIO_CACHE_CONTROL)] {
        for key in storage.list(&format!("{}{folder}/", storage.prefix())).await? {
            let (content_type, current) = storage.head(&key).await?;
            if current.as_deref() == Some(cache_control) {
                continue;
            }
            println!("cache-control  {key}");
            if !dry_run {
                storage
                    .set_cache_control(&key, content_type.as_deref(), cache_control)
                    .await?;
            }
            updated += 1;
        }
    }
    let verb = if dry_run { "would update" } else { "updated" };
    println!("{verb}: {updated} cache-control header(s)");
    Ok(())
}

async fn orphans(storage: &Storage, pool: &PgPool, delete: bool) -> anyhow::Result<()> {
    let referenced: HashSet<String> = sqlx::query_scalar!(
        r#"SELECT cover_object_id AS "key!" FROM songs
           UNION SELECT cover_object_id FROM playlists
           UNION SELECT object_id FROM audio_versions
           UNION SELECT avatar_object_id FROM users WHERE avatar_object_id IS NOT NULL"#
    )
    .fetch_all(pool)
    .await?
    .into_iter()
    .collect();

    let mut count = 0;
    for folder in ["img", "music"] {
        for key in storage.list(&format!("{}{folder}/", storage.prefix())).await? {
            if referenced.contains(&key) {
                continue;
            }
            println!("{key}");
            if delete {
                storage.delete(&key).await?;
            }
            count += 1;
        }
    }
    println!("{count} orphan object(s){}", if delete { " deleted" } else { "" });
    Ok(())
}
