use axum::{
    Json, Router,
    extract::{Path, Query, State},
    routing::get,
};
use chrono::{DateTime, Utc};
use serde::Serialize;
use serde_json::Value;
use sqlx::types::Json as SqlJson;
use uuid::Uuid;

use super::common::{OK, Ok, PageQuery, Pagination, SearchPageQuery};
use crate::{
    auth::{Admin, Auth, CanView, Upload},
    error::{AppError, AppResult},
    media::{Cover, cover},
    songs::{
        self, SongSummary, StaffEntry,
        write::{self, SongInput},
    },
    state::AppState,
};

const PAGE_SIZE: i64 = 10;
const RANDOM_COUNT: i64 = 5;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/songs", get(list).post(create))
        .route("/songs/random", get(random))
        .route("/songs/{id}", get(detail).put(update).delete(remove))
        .route("/songs/{id}/edit", get(edit_data))
        .route("/admin/songs", get(admin_list))
        .route("/admin/songs/options", get(admin_options))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SongPage {
    songs: Vec<SongSummary>,
    pagination: Pagination,
}

async fn list(
    State(state): State<AppState>,
    _view: CanView,
    Query(query): Query<PageQuery>,
) -> AppResult<Json<SongPage>> {
    let total = sqlx::query_scalar!(r#"SELECT count(*) AS "n!" FROM songs"#)
        .fetch_one(&state.pool)
        .await?;
    let ids = sqlx::query_scalar!(
        "SELECT id FROM songs ORDER BY updated_at DESC, id LIMIT $1 OFFSET $2",
        PAGE_SIZE,
        query.offset(PAGE_SIZE)
    )
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(SongPage {
        songs: songs::summaries(&state, &ids).await?,
        pagination: Pagination::new(query.page(), PAGE_SIZE, total),
    }))
}

#[derive(Serialize)]
struct SongList {
    songs: Vec<SongSummary>,
}

async fn random(State(state): State<AppState>, _view: CanView) -> AppResult<Json<SongList>> {
    let ids = sqlx::query_scalar!("SELECT id FROM songs ORDER BY random() LIMIT $1", RANDOM_COUNT)
        .fetch_all(&state.pool)
        .await?;
    Ok(Json(SongList {
        songs: songs::summaries(&state, &ids).await?,
    }))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SongDetail {
    id: Uuid,
    title: String,
    description: String,
    staff: Vec<StaffEntry>,
    cover: Option<Cover>,
    versions: Vec<VersionView>,
    lyrics: Vec<LyricsView>,
    playlists: Vec<PlaylistRef>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct VersionView {
    id: Uuid,
    name: String,
    is_default: bool,
    lyrics_id: Option<Uuid>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LyricsView {
    id: Uuid,
    version_key: String,
    is_default: bool,
    content: Value,
}

#[derive(Serialize)]
struct PlaylistRef {
    id: Uuid,
    name: String,
}

#[derive(Serialize)]
struct SongDetailResponse {
    song: SongDetail,
}

async fn detail(
    State(state): State<AppState>,
    _view: CanView,
    Path(id): Path<Uuid>,
) -> AppResult<Json<SongDetailResponse>> {
    let song = sqlx::query!(
        r#"SELECT id, title, description, cover_object_id, created_at, updated_at,
                  staff AS "staff: SqlJson<Vec<StaffEntry>>"
           FROM songs WHERE id = $1"#,
        id
    )
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    let versions = sqlx::query_as!(
        VersionView,
        "SELECT id, name, is_default, lyrics_id FROM audio_versions WHERE song_id = $1 ORDER BY position, name",
        id
    )
    .fetch_all(&state.pool)
    .await?;
    let lyrics = sqlx::query_as!(
        LyricsView,
        r#"SELECT id, version_key, is_default, content
           FROM lyrics_documents WHERE song_id = $1 ORDER BY is_default DESC, created_at, version_key"#,
        id
    )
    .fetch_all(&state.pool)
    .await?;
    let playlists = sqlx::query_as!(
        PlaylistRef,
        r#"SELECT p.id, p.name FROM song_playlists sp JOIN playlists p ON p.id = sp.playlist_id
           WHERE sp.song_id = $1 ORDER BY p.name"#,
        id
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(SongDetailResponse {
        song: SongDetail {
            id: song.id,
            title: song.title,
            description: song.description,
            staff: song.staff.0,
            cover: cover(&state, song.cover_object_id.as_deref()),
            versions,
            lyrics,
            playlists,
            created_at: song.created_at,
            updated_at: song.updated_at,
        },
    }))
}

/// 编辑表单需要的原始数据（含对象 key）
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SongEditData {
    id: Uuid,
    title: String,
    description: String,
    staff: Vec<StaffEntry>,
    cover_object_id: Option<String>,
    cover: Option<Cover>,
    versions: Vec<EditVersion>,
    lyrics: Vec<EditLyrics>,
    playlist_ids: Vec<Uuid>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct EditVersion {
    id: Uuid,
    name: String,
    object_id: String,
    is_default: bool,
    lyrics_id: Option<Uuid>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct EditLyrics {
    id: Uuid,
    key: String,
    is_default: bool,
    content: Value,
}

async fn edit_data(
    State(state): State<AppState>,
    _auth: Auth<Admin>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<SongEditData>> {
    let song = sqlx::query!(
        r#"SELECT id, title, description, cover_object_id, staff AS "staff: SqlJson<Vec<StaffEntry>>"
           FROM songs WHERE id = $1"#,
        id
    )
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;
    let versions = sqlx::query_as!(
        EditVersion,
        "SELECT id, name, object_id, is_default, lyrics_id FROM audio_versions WHERE song_id = $1 ORDER BY position, name",
        id
    )
    .fetch_all(&state.pool)
    .await?;
    let lyrics = sqlx::query_as!(
        EditLyrics,
        r#"SELECT id, version_key AS key, is_default, content
           FROM lyrics_documents WHERE song_id = $1 ORDER BY is_default DESC, created_at, version_key"#,
        id
    )
    .fetch_all(&state.pool)
    .await?;
    let playlist_ids = sqlx::query_scalar!("SELECT playlist_id FROM song_playlists WHERE song_id = $1", id)
        .fetch_all(&state.pool)
        .await?;

    Ok(Json(SongEditData {
        id: song.id,
        title: song.title,
        description: song.description,
        staff: song.staff.0,
        cover: cover(&state, song.cover_object_id.as_deref()),
        cover_object_id: song.cover_object_id,
        versions,
        lyrics,
        playlist_ids,
    }))
}

#[derive(Serialize)]
struct Created {
    ok: bool,
    id: Uuid,
}

async fn create(
    State(state): State<AppState>,
    _auth: Auth<Upload>,
    Json(input): Json<SongInput>,
) -> AppResult<Json<Created>> {
    let id = write::create(&state, input).await?;
    Ok(Json(Created { ok: true, id }))
}

async fn update(
    State(state): State<AppState>,
    _auth: Auth<Admin>,
    Path(id): Path<Uuid>,
    Json(input): Json<SongInput>,
) -> AppResult<Json<Created>> {
    if !write::update(&state, id, input).await? {
        return Err(AppError::NotFound);
    }
    Ok(Json(Created { ok: true, id }))
}

async fn remove(
    State(state): State<AppState>,
    _auth: Auth<Admin>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Ok>> {
    let deleted = sqlx::query!("DELETE FROM songs WHERE id = $1", id)
        .execute(&state.pool)
        .await?
        .rows_affected();
    if deleted == 0 {
        return Err(AppError::NotFound);
    }
    Ok(Json(OK))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminSong {
    id: Uuid,
    title: String,
    description: String,
    staff: Vec<StaffEntry>,
    cover: Option<Cover>,
    version_count: i64,
    lyrics_count: i64,
    updated_at: DateTime<Utc>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminSongPage {
    songs: Vec<AdminSong>,
    pagination: Pagination,
}

/// 管理列表：按标题、简介、staff 模糊搜索
async fn admin_list(
    State(state): State<AppState>,
    _auth: Auth<Admin>,
    Query(query): Query<SearchPageQuery>,
) -> AppResult<Json<AdminSongPage>> {
    let pattern = query.like_pattern();
    let rows = sqlx::query!(
        r#"SELECT s.id, s.title, s.description, s.cover_object_id, s.updated_at,
                  s.staff AS "staff: SqlJson<Vec<StaffEntry>>",
                  (SELECT count(*) FROM audio_versions a WHERE a.song_id = s.id) AS "version_count!",
                  (SELECT count(*) FROM lyrics_documents l WHERE l.song_id = s.id) AS "lyrics_count!",
                  count(*) OVER () AS "total!"
           FROM songs s
           WHERE s.title ILIKE $1 OR s.description ILIKE $1 OR s.staff::text ILIKE $1
           ORDER BY s.updated_at DESC, s.id
           LIMIT $2 OFFSET $3"#,
        pattern,
        PAGE_SIZE,
        query.offset(PAGE_SIZE)
    )
    .fetch_all(&state.pool)
    .await?;
    let total = match rows.first() {
        Some(row) => row.total,
        None => {
            sqlx::query_scalar!(
                r#"SELECT count(*) AS "n!" FROM songs s
               WHERE s.title ILIKE $1 OR s.description ILIKE $1 OR s.staff::text ILIKE $1"#,
                pattern
            )
            .fetch_one(&state.pool)
            .await?
        }
    };
    let songs = rows
        .into_iter()
        .map(|row| AdminSong {
            id: row.id,
            title: row.title,
            description: row.description,
            staff: row.staff.0,
            cover: cover(&state, row.cover_object_id.as_deref()),
            version_count: row.version_count,
            lyrics_count: row.lyrics_count,
            updated_at: row.updated_at,
        })
        .collect();
    Ok(Json(AdminSongPage {
        songs,
        pagination: Pagination::new(query.page(), PAGE_SIZE, total),
    }))
}

#[derive(Serialize)]
struct SongOption {
    id: Uuid,
    title: String,
    description: String,
}

#[derive(Serialize)]
struct SongOptions {
    songs: Vec<SongOption>,
}

/// 全部歌曲的精简列表（往歌单里添加歌曲时选择）
async fn admin_options(State(state): State<AppState>, _auth: Auth<Admin>) -> AppResult<Json<SongOptions>> {
    let songs = sqlx::query_as!(
        SongOption,
        "SELECT id, title, description FROM songs ORDER BY title"
    )
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(SongOptions { songs }))
}
