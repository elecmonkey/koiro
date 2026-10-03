use std::collections::HashSet;

use axum::{
    Router,
    extract::State,
    http::StatusCode,
    routing::{delete, get},
};
use chrono::{DateTime, Utc};

use super::extract::{Json, Path, Query};
use crate::{
    api::{
        AddedSongs, Page, PageQuery, Playlist, PlaylistFilter, PlaylistId, PlaylistInput, PlaylistOption,
        PlaylistPatch, PlaylistSongs, SongId,
    },
    auth::{Admin, Auth, CanView},
    db::like_pattern,
    error::{AppError, AppResult},
    media::{image_url, is_image_key},
    state::AppState,
};

/// 首页随机推荐的数量
const RANDOM_COUNT: i64 = 4;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/playlists", get(list).post(create))
        .route("/playlists/random", get(random))
        .route("/playlists/options", get(options))
        .route("/playlists/{id}", get(detail).patch(update).delete(remove))
        .route(
            "/playlists/{id}/songs",
            axum::routing::post(add_songs).put(reorder_songs),
        )
        .route("/playlists/{id}/songs/{song_id}", delete(remove_song))
}

struct PlaylistRow {
    id: PlaylistId,
    name: String,
    description: String,
    cover_object_id: String,
    song_count: i64,
    updated_at: DateTime<Utc>,
}

impl PlaylistRow {
    fn into_api(self, state: &AppState) -> Playlist {
        Playlist {
            id: self.id,
            name: self.name,
            description: self.description,
            cover_url: image_url(state, &self.cover_object_id),
            song_count: self.song_count,
            updated_at: self.updated_at,
        }
    }
}

async fn find(state: &AppState, id: PlaylistId) -> AppResult<Playlist> {
    let row = sqlx::query_as!(
        PlaylistRow,
        r#"SELECT p.id AS "id: PlaylistId", p.name, p.description, p.cover_object_id, p.updated_at,
                  (SELECT count(*) FROM song_playlists sp WHERE sp.playlist_id = p.id) AS "song_count!"
           FROM playlists p WHERE p.id = $1"#,
        id as PlaylistId
    )
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;
    Ok(row.into_api(state))
}

/// 按更新时间从新到旧；`q` 匹配名称或简介
async fn list(
    State(state): State<AppState>,
    _view: CanView,
    Query(page): Query<PageQuery>,
    Query(filter): Query<PlaylistFilter>,
) -> AppResult<Json<Page<Playlist>>> {
    let pattern = like_pattern(filter.q.as_deref().unwrap_or_default());
    let total = sqlx::query_scalar!(
        r#"SELECT count(*) AS "n!" FROM playlists WHERE name ILIKE $1 OR description ILIKE $1"#,
        pattern
    )
    .fetch_one(&state.pool)
    .await?;
    let rows = sqlx::query_as!(
        PlaylistRow,
        r#"SELECT p.id AS "id: PlaylistId", p.name, p.description, p.cover_object_id, p.updated_at,
                  (SELECT count(*) FROM song_playlists sp WHERE sp.playlist_id = p.id) AS "song_count!"
           FROM playlists p WHERE p.name ILIKE $1 OR p.description ILIKE $1
           ORDER BY p.updated_at DESC, p.id LIMIT $2 OFFSET $3"#,
        pattern,
        page.limit(),
        page.offset()
    )
    .fetch_all(&state.pool)
    .await?;
    let items = rows.into_iter().map(|row| row.into_api(&state)).collect();
    Ok(Json(Page::new(items, &page, total)))
}

async fn random(State(state): State<AppState>, _view: CanView) -> AppResult<Json<Vec<Playlist>>> {
    let rows = sqlx::query_as!(
        PlaylistRow,
        r#"SELECT p.id AS "id: PlaylistId", p.name, p.description, p.cover_object_id, p.updated_at,
                  (SELECT count(*) FROM song_playlists sp WHERE sp.playlist_id = p.id) AS "song_count!"
           FROM playlists p ORDER BY random() LIMIT $1"#,
        RANDOM_COUNT
    )
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(rows.into_iter().map(|row| row.into_api(&state)).collect()))
}

/// 全部歌单的精简列表，按名称排序
async fn options(State(state): State<AppState>, _view: CanView) -> AppResult<Json<Vec<PlaylistOption>>> {
    Ok(Json(
        sqlx::query_as!(
            PlaylistOption,
            r#"SELECT id AS "id: PlaylistId", name FROM playlists ORDER BY name, id"#
        )
        .fetch_all(&state.pool)
        .await?,
    ))
}

/// 歌单里的歌曲用 `GET /songs?playlist=<id>` 获取
async fn detail(
    State(state): State<AppState>,
    _view: CanView,
    Path(id): Path<PlaylistId>,
) -> AppResult<Json<Playlist>> {
    Ok(Json(find(&state, id).await?))
}

fn checked_name(name: &str) -> AppResult<String> {
    let name = name.trim();
    if name.is_empty() {
        return Err(AppError::BadRequest("歌单名称不能为空".into()));
    }
    Ok(name.to_owned())
}

fn check_cover(state: &AppState, key: &str) -> AppResult<()> {
    if !is_image_key(state, key) {
        return Err(AppError::BadRequest("请上传封面".into()));
    }
    Ok(())
}

async fn create(
    State(state): State<AppState>,
    _auth: Auth<Admin>,
    Json(body): Json<PlaylistInput>,
) -> AppResult<(StatusCode, Json<Playlist>)> {
    let name = checked_name(&body.name)?;
    check_cover(&state, &body.cover_object_id)?;
    let id = sqlx::query_scalar!(
        r#"INSERT INTO playlists (name, description, cover_object_id) VALUES ($1, $2, $3)
           RETURNING id AS "id: PlaylistId""#,
        name,
        body.description.trim(),
        body.cover_object_id
    )
    .fetch_one(&state.pool)
    .await?;
    Ok((StatusCode::CREATED, Json(find(&state, id).await?)))
}

async fn update(
    State(state): State<AppState>,
    _auth: Auth<Admin>,
    Path(id): Path<PlaylistId>,
    Json(body): Json<PlaylistPatch>,
) -> AppResult<Json<Playlist>> {
    let name = body.name.as_deref().map(checked_name).transpose()?;
    if let Some(key) = &body.cover_object_id {
        check_cover(&state, key)?;
    }
    // 什么都不改时不写库，避免无意义地刷新 updated_at
    if name.is_none() && body.description.is_none() && body.cover_object_id.is_none() {
        return Ok(Json(find(&state, id).await?));
    }
    let updated = sqlx::query!(
        r#"UPDATE playlists SET
               name = COALESCE($2, name),
               description = COALESCE($3, description),
               cover_object_id = COALESCE($4, cover_object_id)
           WHERE id = $1"#,
        id as PlaylistId,
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
    Ok(Json(find(&state, id).await?))
}

async fn remove(
    State(state): State<AppState>,
    _auth: Auth<Admin>,
    Path(id): Path<PlaylistId>,
) -> AppResult<StatusCode> {
    let deleted = sqlx::query!("DELETE FROM playlists WHERE id = $1", id as PlaylistId)
        .execute(&state.pool)
        .await?
        .rows_affected();
    if deleted == 0 {
        return Err(AppError::NotFound);
    }
    Ok(StatusCode::NO_CONTENT)
}

/// 锁住歌单行：同一歌单的追加、重排串行执行
async fn lock(tx: &mut sqlx::Transaction<'_, sqlx::Postgres>, id: PlaylistId) -> AppResult<()> {
    sqlx::query!(
        "SELECT id FROM playlists WHERE id = $1 FOR UPDATE",
        id as PlaylistId
    )
    .fetch_optional(&mut **tx)
    .await?
    .ok_or(AppError::NotFound)?;
    Ok(())
}

/// 按给出的顺序追加到末尾；已在歌单里、不存在或重复给出的跳过
async fn add_songs(
    State(state): State<AppState>,
    _auth: Auth<Admin>,
    Path(id): Path<PlaylistId>,
    Json(body): Json<PlaylistSongs>,
) -> AppResult<Json<AddedSongs>> {
    if body.song_ids.is_empty() {
        return Err(AppError::BadRequest("请选择要加入的歌曲".into()));
    }
    let mut seen = HashSet::new();
    let song_ids: Vec<SongId> = body
        .song_ids
        .iter()
        .copied()
        .filter(|id| seen.insert(*id))
        .collect();
    let mut tx = state.pool.begin().await?;
    lock(&mut tx, id).await?;
    let added = sqlx::query!(
        r#"INSERT INTO song_playlists (song_id, playlist_id, position)
           SELECT s.id, $1,
                  (SELECT COALESCE(max(position), -1) FROM song_playlists WHERE playlist_id = $1)
                  + row_number() OVER (ORDER BY t.ord)
           FROM unnest($2::uuid[]) WITH ORDINALITY AS t(song_id, ord)
           JOIN songs s ON s.id = t.song_id
           WHERE NOT EXISTS (SELECT 1 FROM song_playlists sp WHERE sp.playlist_id = $1 AND sp.song_id = s.id)"#,
        id as PlaylistId,
        &song_ids as &[SongId]
    )
    .execute(&mut *tx)
    .await?
    .rows_affected();
    tx.commit().await?;
    let added = i64::try_from(added).map_err(anyhow::Error::from)?;
    Ok(Json(AddedSongs {
        added,
        skipped: body.song_ids.len() as i64 - added,
    }))
}

/// 必须恰好给出歌单里的每一首歌各一次
async fn reorder_songs(
    State(state): State<AppState>,
    _auth: Auth<Admin>,
    Path(id): Path<PlaylistId>,
    Json(body): Json<PlaylistSongs>,
) -> AppResult<StatusCode> {
    let mut tx = state.pool.begin().await?;
    lock(&mut tx, id).await?;
    let current: HashSet<SongId> = sqlx::query_scalar!(
        r#"SELECT song_id AS "id: SongId" FROM song_playlists WHERE playlist_id = $1"#,
        id as PlaylistId
    )
    .fetch_all(&mut *tx)
    .await?
    .into_iter()
    .collect();
    let given: HashSet<SongId> = body.song_ids.iter().copied().collect();
    if given.len() != body.song_ids.len() || given != current {
        return Err(AppError::BadRequest(
            "请按新顺序给出歌单里的全部歌曲，每首一次".into(),
        ));
    }
    sqlx::query!(
        r#"UPDATE song_playlists sp SET position = t.ord - 1
           FROM unnest($2::uuid[]) WITH ORDINALITY AS t(song_id, ord)
           WHERE sp.playlist_id = $1 AND sp.song_id = t.song_id"#,
        id as PlaylistId,
        &body.song_ids as &[SongId]
    )
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn remove_song(
    State(state): State<AppState>,
    _auth: Auth<Admin>,
    Path((id, song_id)): Path<(PlaylistId, SongId)>,
) -> AppResult<StatusCode> {
    let removed = sqlx::query!(
        "DELETE FROM song_playlists WHERE playlist_id = $1 AND song_id = $2",
        id as PlaylistId,
        song_id as SongId
    )
    .execute(&state.pool)
    .await?
    .rows_affected();
    if removed == 0 {
        return Err(AppError::NotFound);
    }
    Ok(StatusCode::NO_CONTENT)
}
