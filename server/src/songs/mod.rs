//! 歌曲的读取：列表摘要、完整信息，以及可编辑的输入形式

pub mod write;

use std::collections::HashMap;

use anyhow::anyhow;
use chrono::{DateTime, Utc};
use sqlx::types::Json;

use crate::{
    api::{
        AudioVersion, AudioVersionId, AudioVersionInput, Language, LyricLine, Lyrics, LyricsId, LyricsInput,
        PlaylistId, PlaylistRef, SongDetail, SongId, SongInput, SongSummary, StaffCredit, UserId,
    },
    error::{AppError, AppResult},
    media::image_url,
    state::AppState,
};

/// 歌曲的创建者（`None` 为无主）；歌曲不存在时 404
pub async fn owner(state: &AppState, id: SongId) -> AppResult<Option<UserId>> {
    sqlx::query_scalar!(
        r#"SELECT created_by AS "created_by?: UserId" FROM songs WHERE id = $1"#,
        id as SongId
    )
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)
}

/// 数据库里的语种代码 → [`Language`]；写入时已校验，读到未知代码说明数据损坏
pub fn parse_language(code: &str) -> AppResult<Language> {
    Language::from_code(code).ok_or_else(|| AppError::Internal(anyhow!("unknown language {code:?}")))
}

pub fn parse_languages(codes: Vec<String>) -> AppResult<Vec<Language>> {
    codes.iter().map(|code| parse_language(code)).collect()
}

pub fn language_codes(languages: &[Language]) -> Vec<String> {
    languages
        .iter()
        .map(|language| language.code().to_owned())
        .collect()
}

/// 按给定顺序返回歌曲摘要（不存在的 ID 被忽略）
pub async fn summaries(state: &AppState, ids: &[SongId]) -> AppResult<Vec<SongSummary>> {
    if ids.is_empty() {
        return Ok(Vec::new());
    }
    let rows = sqlx::query!(
        r#"SELECT s.id AS "id: SongId", s.title, s.description, s.cover_object_id, s.updated_at,
                  s.staff AS "staff: Json<Vec<StaffCredit>>",
                  av.id AS "version_id: AudioVersionId", av.name AS version_name,
                  av.lyrics_id AS "lyrics_id: LyricsId",
                  (SELECT count(*) FROM audio_versions x WHERE x.song_id = s.id) AS "version_count!",
                  (SELECT count(*) FROM lyrics x WHERE x.song_id = s.id) AS "lyrics_count!"
           FROM songs s JOIN audio_versions av ON av.song_id = s.id AND av.is_default
           WHERE s.id = ANY($1)"#,
        ids as &[SongId]
    )
    .fetch_all(&state.pool)
    .await?;

    let mut by_id: HashMap<SongId, SongSummary> = rows
        .into_iter()
        .map(|row| {
            let summary = SongSummary {
                id: row.id,
                title: row.title,
                description: row.description,
                staff: row.staff.0,
                cover_url: image_url(state, &row.cover_object_id),
                default_version: AudioVersion {
                    id: row.version_id,
                    name: row.version_name,
                    is_default: true,
                    lyrics_id: row.lyrics_id,
                },
                version_count: row.version_count,
                lyrics_count: row.lyrics_count,
                updated_at: row.updated_at,
            };
            (summary.id, summary)
        })
        .collect();
    Ok(ids.iter().filter_map(|id| by_id.remove(id)).collect())
}

struct SongRow {
    id: SongId,
    title: String,
    description: String,
    staff: Json<Vec<StaffCredit>>,
    cover_object_id: String,
    created_by: Option<UserId>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

async fn song_row(state: &AppState, id: SongId) -> AppResult<Option<SongRow>> {
    Ok(sqlx::query_as!(
        SongRow,
        r#"SELECT id AS "id: SongId", title, description, staff AS "staff: Json<Vec<StaffCredit>>",
                  cover_object_id, created_by AS "created_by?: UserId", created_at, updated_at
           FROM songs WHERE id = $1"#,
        id as SongId
    )
    .fetch_optional(&state.pool)
    .await?)
}

pub async fn detail(state: &AppState, id: SongId) -> AppResult<Option<SongDetail>> {
    let Some(song) = song_row(state, id).await? else {
        return Ok(None);
    };
    let versions = sqlx::query_as!(
        AudioVersion,
        r#"SELECT id AS "id: AudioVersionId", name, is_default, lyrics_id AS "lyrics_id: LyricsId"
           FROM audio_versions WHERE song_id = $1 ORDER BY position"#,
        id as SongId
    )
    .fetch_all(&state.pool)
    .await?;
    let lyrics = sqlx::query!(
        r#"SELECT id AS "id: LyricsId", name, is_default, languages, lines AS "lines: Json<Vec<LyricLine>>"
           FROM lyrics WHERE song_id = $1 ORDER BY position"#,
        id as SongId
    )
    .fetch_all(&state.pool)
    .await?
    .into_iter()
    .map(|row| {
        Ok(Lyrics {
            id: row.id,
            name: row.name,
            is_default: row.is_default,
            languages: parse_languages(row.languages)?,
            lines: row.lines.0,
        })
    })
    .collect::<AppResult<_>>()?;
    let playlists = sqlx::query_as!(
        PlaylistRef,
        r#"SELECT p.id AS "id: PlaylistId", p.name
           FROM song_playlists sp JOIN playlists p ON p.id = sp.playlist_id
           WHERE sp.song_id = $1 ORDER BY p.name, p.id"#,
        id as SongId
    )
    .fetch_all(&state.pool)
    .await?;
    let owner = crate::users::owner_ref(state, song.created_by).await?;

    Ok(Some(SongDetail {
        id: song.id,
        title: song.title,
        description: song.description,
        staff: song.staff.0,
        cover_url: image_url(state, &song.cover_object_id),
        versions,
        lyrics,
        playlists,
        owner,
        created_at: song.created_at,
        updated_at: song.updated_at,
    }))
}

/// 现有歌曲的可编辑形式：原样修改后可交给 PUT 整体替换
pub async fn input(state: &AppState, id: SongId) -> AppResult<Option<SongInput>> {
    let Some(song) = song_row(state, id).await? else {
        return Ok(None);
    };
    let versions = sqlx::query_as!(
        AudioVersionInput,
        r#"SELECT av.name, av.object_id, av.is_default, l.name AS "lyrics_name?"
           FROM audio_versions av LEFT JOIN lyrics l ON l.id = av.lyrics_id
           WHERE av.song_id = $1 ORDER BY av.position"#,
        id as SongId
    )
    .fetch_all(&state.pool)
    .await?;
    let lyrics = sqlx::query!(
        r#"SELECT name, is_default, languages, lines AS "lines: Json<Vec<LyricLine>>"
           FROM lyrics WHERE song_id = $1 ORDER BY position"#,
        id as SongId
    )
    .fetch_all(&state.pool)
    .await?
    .into_iter()
    .map(|row| {
        Ok(LyricsInput {
            name: row.name,
            is_default: row.is_default,
            languages: parse_languages(row.languages)?,
            lines: row.lines.0,
        })
    })
    .collect::<AppResult<_>>()?;
    let playlist_ids = sqlx::query_scalar!(
        r#"SELECT sp.playlist_id AS "id: PlaylistId"
           FROM song_playlists sp JOIN playlists p ON p.id = sp.playlist_id
           WHERE sp.song_id = $1 ORDER BY p.name, p.id"#,
        id as SongId
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(Some(SongInput {
        title: song.title,
        description: song.description,
        cover_object_id: song.cover_object_id,
        staff: song.staff.0,
        versions,
        lyrics,
        playlist_ids,
    }))
}
