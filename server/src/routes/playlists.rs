use axum::{
    Json, Router,
    extract::{Path, Query, State},
    routing::{delete, get},
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::common::{OK, Ok, PageQuery, Pagination, SearchPageQuery};
use crate::{
    auth::{Admin, Auth, CanView},
    error::{AppError, AppResult},
    media::{Cover, cover},
    songs::{self, SongSummary},
    state::AppState,
};

const PAGE_SIZE: i64 = 10;
const RANDOM_COUNT: i64 = 4;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/playlists", get(list).post(create))
        .route("/playlists/random", get(random))
        .route("/playlists/options", get(options))
        .route("/playlists/{id}", get(detail).put(update).delete(remove))
        .route(
            "/playlists/{id}/songs",
            axum::routing::post(add_songs).put(reorder_songs),
        )
        .route("/playlists/{id}/songs/{song_id}", delete(remove_song))
        .route("/admin/playlists", get(admin_list))
        .route("/admin/playlists/{id}", get(admin_detail))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PlaylistSummary {
    id: Uuid,
    name: String,
    description: String,
    cover: Option<Cover>,
    song_count: i64,
    updated_at: DateTime<Utc>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PlaylistPage {
    playlists: Vec<PlaylistSummary>,
    pagination: Pagination,
}

async fn list(
    State(state): State<AppState>,
    _view: CanView,
    Query(query): Query<PageQuery>,
) -> AppResult<Json<PlaylistPage>> {
    let total = sqlx::query_scalar!(r#"SELECT count(*) AS "n!" FROM playlists"#)
        .fetch_one(&state.pool)
        .await?;
    let rows = sqlx::query!(
        r#"SELECT p.id, p.name, p.description, p.cover_object_id, p.updated_at,
                  (SELECT count(*) FROM song_playlists sp WHERE sp.playlist_id = p.id) AS "song_count!"
           FROM playlists p ORDER BY p.updated_at DESC, p.id LIMIT $1 OFFSET $2"#,
        PAGE_SIZE,
        query.offset(PAGE_SIZE)
    )
    .fetch_all(&state.pool)
    .await?;
    let playlists = rows
        .into_iter()
        .map(|row| PlaylistSummary {
            id: row.id,
            name: row.name,
            description: row.description,
            cover: cover(&state, Some(&row.cover_object_id)),
            song_count: row.song_count,
            updated_at: row.updated_at,
        })
        .collect();
    Ok(Json(PlaylistPage {
        playlists,
        pagination: Pagination::new(query.page(), PAGE_SIZE, total),
    }))
}

#[derive(Serialize)]
struct PlaylistList {
    playlists: Vec<PlaylistSummary>,
}

async fn random(State(state): State<AppState>, _view: CanView) -> AppResult<Json<PlaylistList>> {
    let rows = sqlx::query!(
        r#"SELECT p.id, p.name, p.description, p.cover_object_id, p.updated_at,
                  (SELECT count(*) FROM song_playlists sp WHERE sp.playlist_id = p.id) AS "song_count!"
           FROM playlists p ORDER BY random() LIMIT $1"#,
        RANDOM_COUNT
    )
    .fetch_all(&state.pool)
    .await?;
    let playlists = rows
        .into_iter()
        .map(|row| PlaylistSummary {
            id: row.id,
            name: row.name,
            description: row.description,
            cover: cover(&state, Some(&row.cover_object_id)),
            song_count: row.song_count,
            updated_at: row.updated_at,
        })
        .collect();
    Ok(Json(PlaylistList { playlists }))
}

#[derive(Serialize)]
struct PlaylistOption {
    id: Uuid,
    name: String,
}

#[derive(Serialize)]
struct PlaylistOptions {
    playlists: Vec<PlaylistOption>,
}

/// 上传 / 编辑歌曲时选择所属歌单
async fn options(State(state): State<AppState>, _view: CanView) -> AppResult<Json<PlaylistOptions>> {
    let playlists = sqlx::query_as!(PlaylistOption, "SELECT id, name FROM playlists ORDER BY name")
        .fetch_all(&state.pool)
        .await?;
    Ok(Json(PlaylistOptions { playlists }))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PlaylistDetail {
    playlist: PlaylistSummary,
    songs: Vec<SongSummary>,
    pagination: Pagination,
}

async fn detail(
    State(state): State<AppState>,
    _view: CanView,
    Path(id): Path<Uuid>,
    Query(query): Query<PageQuery>,
) -> AppResult<Json<PlaylistDetail>> {
    let row = sqlx::query!(
        r#"SELECT p.id, p.name, p.description, p.cover_object_id, p.updated_at,
                  (SELECT count(*) FROM song_playlists sp WHERE sp.playlist_id = p.id) AS "song_count!"
           FROM playlists p WHERE p.id = $1"#,
        id
    )
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;
    let ids = sqlx::query_scalar!(
        r#"SELECT song_id FROM song_playlists WHERE playlist_id = $1
           ORDER BY position NULLS LAST, song_id LIMIT $2 OFFSET $3"#,
        id,
        PAGE_SIZE,
        query.offset(PAGE_SIZE)
    )
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(PlaylistDetail {
        pagination: Pagination::new(query.page(), PAGE_SIZE, row.song_count),
        playlist: PlaylistSummary {
            id: row.id,
            name: row.name,
            description: row.description,
            cover: cover(&state, Some(&row.cover_object_id)),
            song_count: row.song_count,
            updated_at: row.updated_at,
        },
        songs: songs::summaries(&state, &ids).await?,
    }))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateBody {
    name: String,
    #[serde(default)]
    description: String,
    cover_object_id: String,
}

#[derive(Serialize)]
struct Created {
    ok: bool,
    id: Uuid,
}

fn check_cover(state: &AppState, key: &str) -> AppResult<()> {
    if key.is_empty() {
        return Err(AppError::BadRequest("必须上传封面".into()));
    }
    if !key.starts_with(&format!("{}img/", state.storage.prefix())) {
        return Err(AppError::BadRequest("无效的封面".into()));
    }
    Ok(())
}

async fn create(
    State(state): State<AppState>,
    _auth: Auth<Admin>,
    Json(body): Json<CreateBody>,
) -> AppResult<Json<Created>> {
    let name = body.name.trim();
    if name.is_empty() {
        return Err(AppError::BadRequest("歌单名称不能为空".into()));
    }
    check_cover(&state, &body.cover_object_id)?;
    let id = sqlx::query_scalar!(
        "INSERT INTO playlists (name, description, cover_object_id) VALUES ($1, $2, $3) RETURNING id",
        name,
        body.description.trim(),
        body.cover_object_id
    )
    .fetch_one(&state.pool)
    .await?;
    Ok(Json(Created { ok: true, id }))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateBody {
    name: Option<String>,
    description: Option<String>,
    cover_object_id: Option<String>,
}

async fn update(
    State(state): State<AppState>,
    _auth: Auth<Admin>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateBody>,
) -> AppResult<Json<Created>> {
    let name = body.name.as_deref().map(str::trim);
    if name.is_some_and(str::is_empty) {
        return Err(AppError::BadRequest("歌单名称不能为空".into()));
    }
    if let Some(key) = &body.cover_object_id {
        check_cover(&state, key)?;
    }
    let updated = sqlx::query!(
        r#"UPDATE playlists SET
               name = COALESCE($2, name),
               description = COALESCE($3, description),
               cover_object_id = COALESCE($4, cover_object_id)
           WHERE id = $1"#,
        id,
        name,
        body.description.as_deref().map(str::trim),
        body.cover_object_id
    )
    .execute(&state.pool)
    .await?
    .rows_affected();
    if updated == 0 {
        return Err(AppError::NotFound);
    }
    Ok(Json(Created { ok: true, id }))
}

async fn remove(
    State(state): State<AppState>,
    _auth: Auth<Admin>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Ok>> {
    let deleted = sqlx::query!("DELETE FROM playlists WHERE id = $1", id)
        .execute(&state.pool)
        .await?
        .rows_affected();
    if deleted == 0 {
        return Err(AppError::NotFound);
    }
    Ok(Json(OK))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SongIdsBody {
    song_ids: Vec<Uuid>,
}

#[derive(Serialize)]
struct AddResult {
    ok: bool,
    added: u64,
    skipped: u64,
}

/// 追加到歌单末尾，已在歌单中的跳过
async fn add_songs(
    State(state): State<AppState>,
    _auth: Auth<Admin>,
    Path(id): Path<Uuid>,
    Json(body): Json<SongIdsBody>,
) -> AppResult<Json<AddResult>> {
    if body.song_ids.is_empty() {
        return Err(AppError::BadRequest("需要提供歌曲 ID".into()));
    }
    // 同一首歌重复出现时只追加一次，保持首次出现的顺序
    let mut seen = std::collections::HashSet::new();
    let song_ids: Vec<Uuid> = body
        .song_ids
        .iter()
        .copied()
        .filter(|id| seen.insert(*id))
        .collect();
    let mut tx = state.pool.begin().await?;
    // 锁住歌单行，避免并发追加算出相同的位置
    sqlx::query!("SELECT id FROM playlists WHERE id = $1 FOR UPDATE", id)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or(AppError::NotFound)?;
    let added = sqlx::query!(
        r#"INSERT INTO song_playlists (song_id, playlist_id, position)
           SELECT s.id, $1,
                  (SELECT COALESCE(max(position), -1) FROM song_playlists WHERE playlist_id = $1) + t.ord
           FROM unnest($2::uuid[]) WITH ORDINALITY AS t(song_id, ord)
           JOIN songs s ON s.id = t.song_id
           WHERE NOT EXISTS (SELECT 1 FROM song_playlists sp WHERE sp.playlist_id = $1 AND sp.song_id = s.id)"#,
        id,
        &song_ids
    )
    .execute(&mut *tx)
    .await?
    .rows_affected();
    tx.commit().await?;
    Ok(Json(AddResult {
        ok: true,
        added,
        skipped: body.song_ids.len() as u64 - added,
    }))
}

/// 按给定顺序重排：列出的歌曲依次占据位置 0..n，未列出的歌曲位置不变
async fn reorder_songs(
    State(state): State<AppState>,
    _auth: Auth<Admin>,
    Path(id): Path<Uuid>,
    Json(body): Json<SongIdsBody>,
) -> AppResult<Json<Ok>> {
    sqlx::query!(
        r#"UPDATE song_playlists sp SET position = t.ord - 1
           FROM unnest($2::uuid[]) WITH ORDINALITY AS t(song_id, ord)
           WHERE sp.playlist_id = $1 AND sp.song_id = t.song_id"#,
        id,
        &body.song_ids
    )
    .execute(&state.pool)
    .await?;
    Ok(Json(OK))
}

async fn remove_song(
    State(state): State<AppState>,
    _auth: Auth<Admin>,
    Path((id, song_id)): Path<(Uuid, Uuid)>,
) -> AppResult<Json<Ok>> {
    sqlx::query!(
        "DELETE FROM song_playlists WHERE playlist_id = $1 AND song_id = $2",
        id,
        song_id
    )
    .execute(&state.pool)
    .await?;
    Ok(Json(OK))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminPlaylist {
    id: Uuid,
    name: String,
    description: String,
    cover_object_id: String,
    cover: Option<Cover>,
    song_count: i64,
    updated_at: DateTime<Utc>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminPlaylistPage {
    playlists: Vec<AdminPlaylist>,
    pagination: Pagination,
}

async fn admin_list(
    State(state): State<AppState>,
    _auth: Auth<Admin>,
    Query(query): Query<SearchPageQuery>,
) -> AppResult<Json<AdminPlaylistPage>> {
    let pattern = query.like_pattern();
    let total = sqlx::query_scalar!(
        r#"SELECT count(*) AS "n!" FROM playlists WHERE name ILIKE $1 OR description ILIKE $1"#,
        pattern
    )
    .fetch_one(&state.pool)
    .await?;
    let rows = sqlx::query!(
        r#"SELECT p.id, p.name, p.description, p.cover_object_id, p.updated_at,
                  (SELECT count(*) FROM song_playlists sp WHERE sp.playlist_id = p.id) AS "song_count!"
           FROM playlists p WHERE p.name ILIKE $1 OR p.description ILIKE $1
           ORDER BY p.updated_at DESC, p.id LIMIT $2 OFFSET $3"#,
        pattern,
        PAGE_SIZE,
        query.offset(PAGE_SIZE)
    )
    .fetch_all(&state.pool)
    .await?;
    let playlists = rows
        .into_iter()
        .map(|row| AdminPlaylist {
            id: row.id,
            name: row.name,
            description: row.description,
            cover: cover(&state, Some(&row.cover_object_id)),
            cover_object_id: row.cover_object_id,
            song_count: row.song_count,
            updated_at: row.updated_at,
        })
        .collect();
    Ok(Json(AdminPlaylistPage {
        playlists,
        pagination: Pagination::new(query.page(), PAGE_SIZE, total),
    }))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminPlaylistSong {
    id: Uuid,
    title: String,
    description: String,
    cover: Option<Cover>,
    position: Option<i32>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminPlaylistInfo {
    id: Uuid,
    name: String,
    description: String,
    cover: Option<Cover>,
}

#[derive(Serialize)]
struct AdminPlaylistDetail {
    playlist: AdminPlaylistInfo,
    songs: Vec<AdminPlaylistSong>,
}

/// 管理歌单内歌曲：返回全部歌曲（不分页）
async fn admin_detail(
    State(state): State<AppState>,
    _auth: Auth<Admin>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<AdminPlaylistDetail>> {
    let playlist = sqlx::query!(
        "SELECT id, name, description, cover_object_id FROM playlists WHERE id = $1",
        id
    )
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;
    let rows = sqlx::query!(
        r#"SELECT s.id, s.title, s.description, s.cover_object_id, sp.position
           FROM song_playlists sp JOIN songs s ON s.id = sp.song_id
           WHERE sp.playlist_id = $1 ORDER BY sp.position NULLS LAST, s.id"#,
        id
    )
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(AdminPlaylistDetail {
        playlist: AdminPlaylistInfo {
            id: playlist.id,
            name: playlist.name,
            description: playlist.description,
            cover: cover(&state, Some(&playlist.cover_object_id)),
        },
        songs: rows
            .into_iter()
            .map(|row| AdminPlaylistSong {
                id: row.id,
                title: row.title,
                description: row.description,
                cover: cover(&state, row.cover_object_id.as_deref()),
                position: row.position,
            })
            .collect(),
    }))
}
