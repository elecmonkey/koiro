//! 新建 / 更新歌曲：整份表单提交，在一个事务里落库

use std::collections::{HashMap, HashSet};

use serde::Deserialize;
use sqlx::{Postgres, Transaction, types::Json};
use uuid::Uuid;

use super::StaffEntry;
use crate::{
    error::{AppError, AppResult},
    lyrics::{self, LineInput},
    state::AppState,
};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SongInput {
    pub title: String,
    #[serde(default)]
    pub description: String,
    pub cover_object_id: Option<String>,
    #[serde(default)]
    pub staff: Vec<StaffInput>,
    pub versions: Vec<VersionInput>,
    #[serde(default)]
    pub lyrics: Vec<LyricsInput>,
    #[serde(default)]
    pub playlist_ids: Vec<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct StaffInput {
    #[serde(default)]
    pub role: String,
    pub name: StaffName,
}

/// 兼容单人（字符串）与多人（数组）
#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum StaffName {
    One(String),
    Many(Vec<String>),
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VersionInput {
    pub name: String,
    pub object_id: String,
    #[serde(default)]
    pub is_default: bool,
    /// 绑定的歌词版本名（同一次提交中 `lyrics[].key`）
    pub lyrics_key: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LyricsInput {
    pub key: String,
    #[serde(default)]
    pub is_default: bool,
    #[serde(default)]
    pub languages: Vec<String>,
    #[serde(default)]
    pub lines: Vec<LineInput>,
}

/// 校验并规范化后的歌曲
struct Validated {
    title: String,
    description: String,
    cover_object_id: String,
    staff: Vec<StaffEntry>,
    versions: Vec<ValidVersion>,
    lyrics: Vec<ValidLyrics>,
    playlist_ids: Vec<Uuid>,
}

struct ValidVersion {
    name: String,
    object_id: String,
    is_default: bool,
    lyrics_key: Option<String>,
}

struct ValidLyrics {
    key: String,
    is_default: bool,
    content: serde_json::Value,
    plain_text: String,
}

fn bad(message: impl Into<String>) -> AppError {
    AppError::BadRequest(message.into())
}

fn validate(state: &AppState, input: SongInput) -> AppResult<Validated> {
    let title = input.title.trim().to_owned();
    if title.is_empty() {
        return Err(bad("歌曲名不能为空"));
    }

    // 只允许引用本站生成的对象，避免指向桶里的任意 key
    let img_prefix = format!("{}img/", state.storage.prefix());
    let music_prefix = format!("{}music/", state.storage.prefix());
    let cover_object_id = input
        .cover_object_id
        .filter(|key| !key.is_empty())
        .ok_or_else(|| bad("必须上传封面"))?;
    if !cover_object_id.starts_with(&img_prefix) {
        return Err(bad("无效的封面"));
    }

    let staff = input
        .staff
        .into_iter()
        .map(|item| {
            let names = match item.name {
                StaffName::One(name) => vec![name],
                StaffName::Many(names) => names,
            };
            StaffEntry {
                role: item.role.trim().to_owned(),
                name: names
                    .into_iter()
                    .map(|n| n.trim().to_owned())
                    .filter(|n| !n.is_empty())
                    .collect(),
            }
        })
        .filter(|item| !item.role.is_empty() || !item.name.is_empty())
        .collect();

    // 歌词版本
    let mut lyrics = Vec::with_capacity(input.lyrics.len());
    let mut lyrics_keys = HashSet::new();
    for item in input.lyrics {
        let key = match item.key.trim() {
            "" => "未命名".to_owned(),
            key => key.to_owned(),
        };
        if !lyrics_keys.insert(key.clone()) {
            return Err(bad(format!("歌词版本名重复：{key}")));
        }
        let doc = lyrics::build(&item.lines, &item.languages)
            .map_err(|err| bad(format!("歌词「{key}」：{err}")))?;
        lyrics.push(ValidLyrics {
            key,
            is_default: item.is_default,
            content: doc.content,
            plain_text: doc.plain_text,
        });
    }
    ensure_single_default(lyrics.iter_mut().map(|l| &mut l.is_default));

    // 音频版本
    if input.versions.is_empty() {
        return Err(bad("必须至少添加一个音频版本"));
    }
    let mut versions = Vec::with_capacity(input.versions.len());
    let mut version_names = HashSet::new();
    for item in input.versions {
        let name = item.name.trim().to_owned();
        if name.is_empty() {
            return Err(bad("音频版本名不能为空"));
        }
        if !version_names.insert(name.clone()) {
            return Err(bad(format!("音频版本名重复：{name}")));
        }
        if !item.object_id.starts_with(&music_prefix) {
            return Err(bad(format!("音频版本「{name}」未上传音频")));
        }
        let lyrics_key = item.lyrics_key.filter(|k| !k.is_empty());
        if let Some(key) = &lyrics_key
            && !lyrics_keys.contains(key)
        {
            return Err(bad(format!("音频版本「{name}」绑定了不存在的歌词「{key}」")));
        }
        versions.push(ValidVersion {
            name,
            object_id: item.object_id,
            is_default: item.is_default,
            lyrics_key,
        });
    }
    ensure_single_default(versions.iter_mut().map(|v| &mut v.is_default));

    let mut seen = HashSet::new();
    let playlist_ids = input
        .playlist_ids
        .into_iter()
        .filter(|id| seen.insert(*id))
        .collect();

    Ok(Validated {
        title,
        description: input.description.trim().to_owned(),
        cover_object_id,
        staff,
        versions,
        lyrics,
        playlist_ids,
    })
}

/// 恰好保留一个默认项：多个时取第一个，没有时选第一项
fn ensure_single_default<'a>(flags: impl Iterator<Item = &'a mut bool>) {
    let mut flags: Vec<&mut bool> = flags.collect();
    let first_default = flags.iter().position(|f| **f).unwrap_or(0);
    for (index, flag) in flags.iter_mut().enumerate() {
        **flag = index == first_default;
    }
}

pub async fn create(state: &AppState, input: SongInput) -> AppResult<Uuid> {
    let song = validate(state, input)?;
    let mut tx = state.pool.begin().await?;
    let id = sqlx::query_scalar!(
        "INSERT INTO songs (title, description, staff, cover_object_id) VALUES ($1, $2, $3, $4) RETURNING id",
        song.title,
        song.description,
        Json(&song.staff) as _,
        song.cover_object_id,
    )
    .fetch_one(&mut *tx)
    .await?;
    save_children(&mut tx, id, &song).await?;
    tx.commit().await?;
    Ok(id)
}

/// 整体替换歌曲内容；返回 false 表示歌曲不存在
pub async fn update(state: &AppState, id: Uuid, input: SongInput) -> AppResult<bool> {
    let song = validate(state, input)?;
    let mut tx = state.pool.begin().await?;
    let updated = sqlx::query!(
        "UPDATE songs SET title = $2, description = $3, staff = $4, cover_object_id = $5 WHERE id = $1",
        id,
        song.title,
        song.description,
        Json(&song.staff) as _,
        song.cover_object_id,
    )
    .execute(&mut *tx)
    .await?
    .rows_affected();
    if updated == 0 {
        return Ok(false);
    }
    save_children(&mut tx, id, &song).await?;
    tx.commit().await?;
    Ok(true)
}

async fn save_children(tx: &mut Transaction<'_, Postgres>, song_id: Uuid, song: &Validated) -> AppResult<()> {
    // 先清空默认标记，避免逐行更新时与「每首歌唯一默认」约束冲突
    sqlx::query!(
        "UPDATE lyrics_documents SET is_default = false WHERE song_id = $1 AND is_default",
        song_id
    )
    .execute(&mut **tx)
    .await?;
    sqlx::query!(
        "UPDATE audio_versions SET is_default = false WHERE song_id = $1 AND is_default",
        song_id
    )
    .execute(&mut **tx)
    .await?;

    // 歌词：按版本名对齐，保留的版本 id 不变
    let keys: Vec<String> = song.lyrics.iter().map(|l| l.key.clone()).collect();
    sqlx::query!(
        "DELETE FROM lyrics_documents WHERE song_id = $1 AND version_key <> ALL($2)",
        song_id,
        &keys
    )
    .execute(&mut **tx)
    .await?;
    let mut lyrics_ids = HashMap::new();
    for item in &song.lyrics {
        let lyrics_id = sqlx::query_scalar!(
            r#"INSERT INTO lyrics_documents (song_id, version_key, is_default, format, content, plain_text)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (song_id, version_key) DO UPDATE
               SET is_default = EXCLUDED.is_default, format = EXCLUDED.format,
                   content = EXCLUDED.content, plain_text = EXCLUDED.plain_text
               RETURNING id"#,
            song_id,
            item.key,
            item.is_default,
            lyrics::FORMAT,
            item.content,
            item.plain_text,
        )
        .fetch_one(&mut **tx)
        .await?;
        lyrics_ids.insert(item.key.as_str(), lyrics_id);
    }

    // 音频版本：按版本名对齐，保留的版本 id 不变（播放器中的引用不失效）
    let names: Vec<String> = song.versions.iter().map(|v| v.name.clone()).collect();
    sqlx::query!(
        "DELETE FROM audio_versions WHERE song_id = $1 AND name <> ALL($2)",
        song_id,
        &names
    )
    .execute(&mut **tx)
    .await?;
    for (position, item) in song.versions.iter().enumerate() {
        let lyrics_id = item
            .lyrics_key
            .as_deref()
            .and_then(|k| lyrics_ids.get(k).copied());
        sqlx::query!(
            r#"INSERT INTO audio_versions (song_id, name, object_id, lyrics_id, is_default, position)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (song_id, name) DO UPDATE
               SET object_id = EXCLUDED.object_id, lyrics_id = EXCLUDED.lyrics_id,
                   is_default = EXCLUDED.is_default, position = EXCLUDED.position"#,
            song_id,
            item.name,
            item.object_id,
            lyrics_id,
            item.is_default,
            position as i32,
        )
        .execute(&mut **tx)
        .await?;
    }

    // 歌单：保留仍选中的歌单里的位置，新加入的排到末尾
    sqlx::query!(
        "DELETE FROM song_playlists WHERE song_id = $1 AND playlist_id <> ALL($2)",
        song_id,
        &song.playlist_ids
    )
    .execute(&mut **tx)
    .await?;
    sqlx::query!(
        r#"INSERT INTO song_playlists (song_id, playlist_id, position)
           SELECT $1, p.id,
                  (SELECT COALESCE(max(position), -1) + 1 FROM song_playlists sp WHERE sp.playlist_id = p.id)
           FROM playlists p
           WHERE p.id = ANY($2)
           ON CONFLICT (song_id, playlist_id) DO NOTHING"#,
        song_id,
        &song.playlist_ids
    )
    .execute(&mut **tx)
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::ensure_single_default;

    fn run(mut flags: Vec<bool>) -> Vec<bool> {
        ensure_single_default(flags.iter_mut());
        flags
    }

    #[test]
    fn single_default() {
        assert_eq!(run(vec![false, false]), vec![true, false]);
        assert_eq!(run(vec![false, true, true]), vec![false, true, false]);
        assert_eq!(run(vec![]), Vec::<bool>::new());
    }
}
