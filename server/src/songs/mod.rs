//! 歌曲的读模型：列表卡片用的摘要，以及按 id 批量取摘要

pub mod write;

use std::collections::HashMap;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::types::Json;
use uuid::Uuid;

use crate::{
    error::AppResult,
    media::{Cover, cover},
    state::AppState,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StaffEntry {
    pub role: String,
    pub name: Vec<String>,
}

/// 默认音频版本及其绑定的歌词（卡片上的播放按钮用）
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DefaultVersion {
    pub id: Uuid,
    pub name: String,
    pub lyrics: Option<Value>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SongSummary {
    pub id: Uuid,
    pub title: String,
    pub description: String,
    pub staff: Vec<StaffEntry>,
    pub cover: Option<Cover>,
    pub default_version: Option<DefaultVersion>,
    pub version_count: i64,
    pub updated_at: DateTime<Utc>,
}

/// 按给定顺序返回歌曲摘要（不存在的 id 被忽略）
pub async fn summaries(state: &AppState, ids: &[Uuid]) -> AppResult<Vec<SongSummary>> {
    if ids.is_empty() {
        return Ok(Vec::new());
    }
    let rows = sqlx::query!(
        r#"SELECT s.id AS "id!", s.title AS "title!", s.description AS "description!",
                  s.cover_object_id, s.updated_at AS "updated_at!",
                  s.staff AS "staff!: Json<Vec<StaffEntry>>",
                  av.id AS "version_id?", av.name AS "version_name?", l.content AS "lyrics?",
                  (SELECT count(*) FROM audio_versions x WHERE x.song_id = s.id) AS "version_count!"
           FROM songs s
           LEFT JOIN audio_versions av ON av.song_id = s.id AND av.is_default
           LEFT JOIN lyrics_documents l ON l.id = av.lyrics_id
           WHERE s.id = ANY($1)"#,
        ids
    )
    .fetch_all(&state.pool)
    .await?;

    let mut by_id: HashMap<Uuid, SongSummary> = rows
        .into_iter()
        .map(|row| {
            let summary = SongSummary {
                id: row.id,
                title: row.title,
                description: row.description,
                staff: row.staff.0,
                cover: cover(state, row.cover_object_id.as_deref()),
                default_version: row
                    .version_id
                    .zip(row.version_name)
                    .map(|(id, name)| DefaultVersion {
                        id,
                        name,
                        lyrics: row.lyrics,
                    }),
                version_count: row.version_count,
                updated_at: row.updated_at,
            };
            (summary.id, summary)
        })
        .collect();
    Ok(ids.iter().filter_map(|id| by_id.remove(id)).collect())
}
