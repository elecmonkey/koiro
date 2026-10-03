//! 新建 / 整体替换歌曲：校验整份输入，在一个事务里落库

use std::collections::{HashMap, HashSet};

use sqlx::{Postgres, Transaction, types::Json};

use super::language_codes;
use crate::{
    api::{AudioVersionInput, LyricsId, LyricsInput, PlaylistId, SongId, SongInput, StaffCredit},
    error::{AppError, AppResult},
    lyrics,
    media::{is_audio_key, is_image_key},
    state::AppState,
};

fn bad(message: impl Into<String>) -> AppError {
    AppError::BadRequest(message.into())
}

fn trimmed(value: &str) -> String {
    value.trim().to_owned()
}

/// 名称去掉首尾空白后不能为空，且在列表内唯一
fn unique_names<'a>(names: impl Iterator<Item = &'a str>, what: &str) -> AppResult<Vec<String>> {
    let mut seen = HashSet::new();
    names
        .map(|name| {
            let name = trimmed(name);
            if name.is_empty() {
                return Err(bad(format!("{what}名称不能为空")));
            }
            if !seen.insert(name.clone()) {
                return Err(bad(format!("{what}名称重复：{name}")));
            }
            Ok(name)
        })
        .collect()
}

fn exactly_one_default(flags: impl Iterator<Item = bool>, what: &str) -> AppResult<()> {
    match flags.filter(|&flag| flag).count() {
        1 => Ok(()),
        _ => Err(bad(format!("{what}必须恰好有一个默认项"))),
    }
}

/// 校验并规范化（去掉首尾空白、合并重复语种）
fn validate(state: &AppState, mut song: SongInput) -> AppResult<SongInput> {
    song.title = trimmed(&song.title);
    if song.title.is_empty() {
        return Err(bad("歌曲名不能为空"));
    }
    song.description = trimmed(&song.description);
    if !is_image_key(state, &song.cover_object_id) {
        return Err(bad("请上传封面"));
    }

    for credit in &mut song.staff {
        credit.role = trimmed(&credit.role);
        credit.names = credit.names.iter().map(|name| trimmed(name)).collect();
        if credit.role.is_empty() {
            return Err(bad("staff 的角色不能为空"));
        }
        if credit.names.is_empty() || credit.names.iter().any(String::is_empty) {
            return Err(bad(format!("staff「{}」的姓名不能为空", credit.role)));
        }
    }

    let lyrics_names = unique_names(song.lyrics.iter().map(|l| l.name.as_str()), "歌词")?;
    for (lyrics, name) in song.lyrics.iter_mut().zip(lyrics_names) {
        lyrics.name = name;
        let mut seen = HashSet::new();
        lyrics.languages.retain(|language| seen.insert(*language));
        lyrics::validate(&lyrics.lines).map_err(|err| bad(format!("歌词「{}」：{err}", lyrics.name)))?;
    }
    if !song.lyrics.is_empty() {
        exactly_one_default(song.lyrics.iter().map(|l| l.is_default), "歌词")?;
    }

    if song.versions.is_empty() {
        return Err(bad("至少需要一个音频版本"));
    }
    let version_names = unique_names(song.versions.iter().map(|v| v.name.as_str()), "音频版本")?;
    for (version, name) in song.versions.iter_mut().zip(version_names) {
        version.name = name;
        version.lyrics_name = version.lyrics_name.as_deref().map(trimmed);
        if !is_audio_key(state, &version.object_id) {
            return Err(bad(format!("音频版本「{}」没有上传音频", version.name)));
        }
        if let Some(lyrics_name) = &version.lyrics_name
            && !song.lyrics.iter().any(|l| &l.name == lyrics_name)
        {
            return Err(bad(format!(
                "音频版本「{}」绑定的歌词「{lyrics_name}」不存在",
                version.name
            )));
        }
    }
    exactly_one_default(song.versions.iter().map(|v| v.is_default), "音频版本")?;

    let mut seen = HashSet::new();
    song.playlist_ids.retain(|id| seen.insert(*id));
    Ok(song)
}

pub async fn create(state: &AppState, input: SongInput) -> AppResult<SongId> {
    let song = validate(state, input)?;
    let mut tx = state.pool.begin().await?;
    let id = sqlx::query_scalar!(
        r#"INSERT INTO songs (title, description, staff, cover_object_id) VALUES ($1, $2, $3, $4)
           RETURNING id AS "id: SongId""#,
        song.title,
        song.description,
        Json(&song.staff) as Json<&Vec<StaffCredit>>,
        song.cover_object_id,
    )
    .fetch_one(&mut *tx)
    .await?;
    save_children(&mut tx, id, &song).await?;
    tx.commit().await?;
    Ok(id)
}

/// 整体替换歌曲内容；歌曲不存在时 404
pub async fn replace(state: &AppState, id: SongId, input: SongInput) -> AppResult<()> {
    let song = validate(state, input)?;
    let mut tx = state.pool.begin().await?;
    let updated = sqlx::query!(
        "UPDATE songs SET title = $2, description = $3, staff = $4, cover_object_id = $5 WHERE id = $1",
        id as SongId,
        song.title,
        song.description,
        Json(&song.staff) as Json<&Vec<StaffCredit>>,
        song.cover_object_id,
    )
    .execute(&mut *tx)
    .await?
    .rows_affected();
    if updated == 0 {
        return Err(AppError::NotFound);
    }
    save_children(&mut tx, id, &song).await?;
    tx.commit().await?;
    Ok(())
}

async fn save_children(
    tx: &mut Transaction<'_, Postgres>,
    song_id: SongId,
    song: &SongInput,
) -> AppResult<()> {
    // 先清空默认标记，避免逐行写入时与「每首歌至多一个默认」的唯一索引冲突
    sqlx::query!(
        "UPDATE lyrics SET is_default = false WHERE song_id = $1 AND is_default",
        song_id as SongId
    )
    .execute(&mut **tx)
    .await?;
    sqlx::query!(
        "UPDATE audio_versions SET is_default = false WHERE song_id = $1 AND is_default",
        song_id as SongId
    )
    .execute(&mut **tx)
    .await?;

    let lyrics_ids = save_lyrics(tx, song_id, &song.lyrics).await?;
    save_versions(tx, song_id, &song.versions, &lyrics_ids).await?;
    save_playlists(tx, song_id, &song.playlist_ids).await
}

/// 按名称对应：名称不变的保留原 ID，不在其中的删除；返回名称 → ID
async fn save_lyrics(
    tx: &mut Transaction<'_, Postgres>,
    song_id: SongId,
    lyrics: &[LyricsInput],
) -> AppResult<HashMap<String, LyricsId>> {
    let names: Vec<&str> = lyrics.iter().map(|l| l.name.as_str()).collect();
    sqlx::query!(
        "DELETE FROM lyrics WHERE song_id = $1 AND name <> ALL($2)",
        song_id as SongId,
        &names as &[&str]
    )
    .execute(&mut **tx)
    .await?;
    let mut ids = HashMap::new();
    for (position, item) in lyrics.iter().enumerate() {
        let id = sqlx::query_scalar!(
            r#"INSERT INTO lyrics (song_id, name, position, is_default, languages, lines, plain_text)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (song_id, name) DO UPDATE
               SET position = EXCLUDED.position, is_default = EXCLUDED.is_default,
                   languages = EXCLUDED.languages, lines = EXCLUDED.lines, plain_text = EXCLUDED.plain_text
               RETURNING id AS "id: LyricsId""#,
            song_id as SongId,
            item.name,
            position as i32,
            item.is_default,
            &language_codes(&item.languages),
            Json(&item.lines) as _,
            lyrics::plain_text(&item.lines),
        )
        .fetch_one(&mut **tx)
        .await?;
        ids.insert(item.name.clone(), id);
    }
    Ok(ids)
}

/// 按名称对应：名称不变的保留原 ID（播放器里的引用不失效），不在其中的删除
async fn save_versions(
    tx: &mut Transaction<'_, Postgres>,
    song_id: SongId,
    versions: &[AudioVersionInput],
    lyrics_ids: &HashMap<String, LyricsId>,
) -> AppResult<()> {
    let names: Vec<&str> = versions.iter().map(|v| v.name.as_str()).collect();
    sqlx::query!(
        "DELETE FROM audio_versions WHERE song_id = $1 AND name <> ALL($2)",
        song_id as SongId,
        &names as &[&str]
    )
    .execute(&mut **tx)
    .await?;
    for (position, item) in versions.iter().enumerate() {
        let lyrics_id = item.lyrics_name.as_ref().map(|name| lyrics_ids[name]);
        sqlx::query!(
            r#"INSERT INTO audio_versions (song_id, name, position, is_default, object_id, lyrics_id)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (song_id, name) DO UPDATE
               SET position = EXCLUDED.position, is_default = EXCLUDED.is_default,
                   object_id = EXCLUDED.object_id, lyrics_id = EXCLUDED.lyrics_id"#,
            song_id as SongId,
            item.name,
            position as i32,
            item.is_default,
            item.object_id,
            lyrics_id as Option<LyricsId>,
        )
        .execute(&mut **tx)
        .await?;
    }
    Ok(())
}

/// 仍选中的歌单里位置不变，新加入的排到末尾，取消选中的移出
async fn save_playlists(
    tx: &mut Transaction<'_, Postgres>,
    song_id: SongId,
    playlist_ids: &[PlaylistId],
) -> AppResult<()> {
    // 锁住要加入的歌单，与并发的追加串行计算末尾位置；按 ID 排序加锁避免死锁
    let found = sqlx::query_scalar!(
        r#"SELECT id AS "id: PlaylistId" FROM playlists WHERE id = ANY($1) ORDER BY id FOR UPDATE"#,
        playlist_ids as &[PlaylistId]
    )
    .fetch_all(&mut **tx)
    .await?;
    if found.len() != playlist_ids.len() {
        return Err(bad("选择的歌单不存在"));
    }
    sqlx::query!(
        "DELETE FROM song_playlists WHERE song_id = $1 AND playlist_id <> ALL($2)",
        song_id as SongId,
        playlist_ids as &[PlaylistId]
    )
    .execute(&mut **tx)
    .await?;
    sqlx::query!(
        r#"INSERT INTO song_playlists (song_id, playlist_id, position)
           SELECT $1, p.id,
                  (SELECT COALESCE(max(position), -1) + 1 FROM song_playlists sp WHERE sp.playlist_id = p.id)
           FROM unnest($2::uuid[]) AS p(id)
           ON CONFLICT (song_id, playlist_id) DO NOTHING"#,
        song_id as SongId,
        playlist_ids as &[PlaylistId]
    )
    .execute(&mut **tx)
    .await?;
    Ok(())
}
