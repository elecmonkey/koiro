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
        AddedSongs, OwnerRef, Page, PageQuery, Permission, Playlist, PlaylistFilter, PlaylistId,
        PlaylistInput, PlaylistOption, PlaylistPatch, PlaylistSongs, SongId, UserId,
    },
    auth::{Auth, CanView, Upload, require_owner_or_admin},
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
        .route("/playlists/mine", get(list_mine))
        .route("/playlists/random", get(random))
        .route("/playlists/options", get(options))
        .route("/playlists/{id}", get(detail).patch(update).delete(remove))
        .route(
            "/playlists/{id}/songs",
            axum::routing::post(add_songs).put(reorder_songs),
        )
        .route("/playlists/{id}/songs/{song_id}", delete(remove_song))
}

/// 歌单的创建者（`None` 为无主）；歌单不存在时 404
async fn owner(state: &AppState, id: PlaylistId) -> AppResult<Option<UserId>> {
    sqlx::query_scalar!(
        r#"SELECT created_by AS "created_by: UserId" FROM playlists WHERE id = $1"#,
        id as PlaylistId
    )
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)
}

struct PlaylistRow {
    id: PlaylistId,
    name: String,
    description: String,
    cover_object_id: String,
    song_count: i64,
    owner_id: Option<UserId>,
    owner_display_name: Option<String>,
    owner_avatar_object_id: Option<String>,
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
            owner: self
                .owner_id
                .zip(self.owner_display_name)
                .map(|(id, display_name)| OwnerRef {
                    id,
                    display_name,
                    avatar_url: self
                        .owner_avatar_object_id
                        .as_deref()
                        .map(|key| image_url(state, key)),
                }),
            updated_at: self.updated_at,
        }
    }
}

async fn find(state: &AppState, id: PlaylistId) -> AppResult<Playlist> {
    let row = sqlx::query_as!(
        PlaylistRow,
        r#"SELECT p.id AS "id: PlaylistId", p.name, p.description, p.cover_object_id, p.updated_at,
                  (SELECT count(*) FROM song_playlists sp WHERE sp.playlist_id = p.id) AS "song_count!",
                  p.created_by AS "owner_id: UserId", u.display_name AS owner_display_name, u.avatar_object_id AS owner_avatar_object_id
           FROM playlists p LEFT JOIN users u ON u.id = p.created_by
           WHERE p.id = $1"#,
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
    list_filtered(&state, &page, &filter, None).await
}

/// 「我的」：非 ADMIN 只看自己创建的歌单，ADMIN 看全部
async fn list_mine(
    State(state): State<AppState>,
    auth: Auth<Upload>,
    Query(page): Query<PageQuery>,
    Query(filter): Query<PlaylistFilter>,
) -> AppResult<Json<Page<Playlist>>> {
    let owner = (!auth.user.permissions.contains(Permission::Admin)).then_some(auth.user.id);
    list_filtered(&state, &page, &filter, owner).await
}

async fn list_filtered(
    state: &AppState,
    page: &PageQuery,
    filter: &PlaylistFilter,
    owner: Option<UserId>,
) -> AppResult<Json<Page<Playlist>>> {
    let pattern = like_pattern(filter.q.as_deref().unwrap_or_default());
    let total = sqlx::query_scalar!(
        r#"SELECT count(*) AS "n!" FROM playlists
           WHERE (name ILIKE $1 OR description ILIKE $1) AND ($2::uuid IS NULL OR created_by = $2)"#,
        pattern,
        owner as Option<UserId>,
    )
    .fetch_one(&state.pool)
    .await?;
    let rows = sqlx::query_as!(
        PlaylistRow,
        r#"SELECT p.id AS "id: PlaylistId", p.name, p.description, p.cover_object_id, p.updated_at,
                  (SELECT count(*) FROM song_playlists sp WHERE sp.playlist_id = p.id) AS "song_count!",
                  p.created_by AS "owner_id: UserId", u.display_name AS owner_display_name, u.avatar_object_id AS owner_avatar_object_id
           FROM playlists p LEFT JOIN users u ON u.id = p.created_by
           WHERE (p.name ILIKE $1 OR p.description ILIKE $1) AND ($4::uuid IS NULL OR p.created_by = $4)
           ORDER BY p.updated_at DESC, p.id LIMIT $2 OFFSET $3"#,
        pattern,
        page.limit(),
        page.offset(),
        owner as Option<UserId>,
    )
    .fetch_all(&state.pool)
    .await?;
    let items = rows.into_iter().map(|row| row.into_api(state)).collect();
    Ok(Json(Page::new(items, page, total)))
}

async fn random(State(state): State<AppState>, _view: CanView) -> AppResult<Json<Vec<Playlist>>> {
    let rows = sqlx::query_as!(
        PlaylistRow,
        r#"SELECT p.id AS "id: PlaylistId", p.name, p.description, p.cover_object_id, p.updated_at,
                  (SELECT count(*) FROM song_playlists sp WHERE sp.playlist_id = p.id) AS "song_count!",
                  p.created_by AS "owner_id: UserId", u.display_name AS owner_display_name, u.avatar_object_id AS owner_avatar_object_id
           FROM playlists p LEFT JOIN users u ON u.id = p.created_by
           ORDER BY random() LIMIT $1"#,
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
    auth: Auth<Upload>,
    Json(body): Json<PlaylistInput>,
) -> AppResult<(StatusCode, Json<Playlist>)> {
    let name = checked_name(&body.name)?;
    check_cover(&state, &body.cover_object_id)?;
    let id = sqlx::query_scalar!(
        r#"INSERT INTO playlists (name, description, cover_object_id, created_by) VALUES ($1, $2, $3, $4)
           RETURNING id AS "id: PlaylistId""#,
        name,
        body.description.trim(),
        body.cover_object_id,
        auth.user.id as UserId,
    )
    .fetch_one(&state.pool)
    .await?;
    Ok((StatusCode::CREATED, Json(find(&state, id).await?)))
}

async fn update(
    State(state): State<AppState>,
    auth: Auth<Upload>,
    Path(id): Path<PlaylistId>,
    Json(body): Json<PlaylistPatch>,
) -> AppResult<Json<Playlist>> {
    require_owner_or_admin(&auth.user, owner(&state, id).await?)?;
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
    auth: Auth<Upload>,
    Path(id): Path<PlaylistId>,
) -> AppResult<StatusCode> {
    require_owner_or_admin(&auth.user, owner(&state, id).await?)?;
    let deleted = sqlx::query!("DELETE FROM playlists WHERE id = $1", id as PlaylistId)
        .execute(&state.pool)
        .await?
        .rows_affected();
    if deleted == 0 {
        return Err(AppError::NotFound);
    }
    Ok(StatusCode::NO_CONTENT)
}

/// 锁住歌单行并返回创建者：同一歌单的追加、重排串行执行；歌单不存在时 404
async fn lock(tx: &mut sqlx::Transaction<'_, sqlx::Postgres>, id: PlaylistId) -> AppResult<Option<UserId>> {
    sqlx::query_scalar!(
        r#"SELECT created_by AS "created_by: UserId" FROM playlists WHERE id = $1 FOR UPDATE"#,
        id as PlaylistId
    )
    .fetch_optional(&mut **tx)
    .await?
    .ok_or(AppError::NotFound)
}

/// 按给出的顺序追加到末尾；已在歌单里、不存在或重复给出的跳过。
/// 要加的歌不需要是自己的，只要是自己的歌单就能加
async fn add_songs(
    State(state): State<AppState>,
    auth: Auth<Upload>,
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
    require_owner_or_admin(&auth.user, lock(&mut tx, id).await?)?;
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
    auth: Auth<Upload>,
    Path(id): Path<PlaylistId>,
    Json(body): Json<PlaylistSongs>,
) -> AppResult<StatusCode> {
    let mut tx = state.pool.begin().await?;
    require_owner_or_admin(&auth.user, lock(&mut tx, id).await?)?;
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
    auth: Auth<Upload>,
    Path((id, song_id)): Path<(PlaylistId, SongId)>,
) -> AppResult<StatusCode> {
    require_owner_or_admin(&auth.user, owner(&state, id).await?)?;
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
