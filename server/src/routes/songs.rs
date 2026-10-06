use axum::{Router, extract::State, http::StatusCode, routing::get};

use super::extract::{Json, Path, Query};
use crate::{
    api::{
        NewSong, Page, PageQuery, Permission, PlaylistId, SongDetail, SongFilter, SongId, SongInput,
        SongOption, SongSummary, UserId,
    },
    auth::{Auth, CanView, Upload, require_owner_or_admin},
    db::like_pattern,
    error::{AppError, AppResult},
    songs::{self, write},
    state::AppState,
};

/// 首页随机推荐的数量
const RANDOM_COUNT: i64 = 5;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/songs", get(list).post(create))
        .route("/songs/mine", get(list_mine))
        .route("/songs/random", get(random))
        .route("/songs/options", get(options))
        .route("/songs/{id}", get(detail).put(replace).delete(remove))
        .route("/songs/{id}/input", get(input))
}

/// 筛选条件可以组合；按歌单筛选时按歌单顺序，否则按更新时间从新到旧
async fn list(
    State(state): State<AppState>,
    _view: CanView,
    Query(page): Query<PageQuery>,
    Query(filter): Query<SongFilter>,
) -> AppResult<Json<Page<SongSummary>>> {
    list_filtered(&state, &page, &filter, None).await
}

/// 「我的」：非 ADMIN 只看自己创建的歌曲，ADMIN 看全部
async fn list_mine(
    State(state): State<AppState>,
    auth: Auth<Upload>,
    Query(page): Query<PageQuery>,
    Query(filter): Query<SongFilter>,
) -> AppResult<Json<Page<SongSummary>>> {
    let owner = (!auth.user.permissions.contains(Permission::Admin)).then_some(auth.user.id);
    list_filtered(&state, &page, &filter, owner).await
}

async fn list_filtered(
    state: &AppState,
    page: &PageQuery,
    filter: &SongFilter,
    owner: Option<UserId>,
) -> AppResult<Json<Page<SongSummary>>> {
    let staff = filter.staff.as_deref().map(str::trim);
    let language = filter.language.as_ref().map(|language| language.code());
    let q = filter.q.as_deref().map(like_pattern);
    let rows = sqlx::query!(
        r#"SELECT s.id AS "id: SongId", count(*) OVER () AS "total!"
           FROM songs s
           LEFT JOIN song_playlists sp ON sp.song_id = s.id AND sp.playlist_id = $3
           WHERE ($1::text IS NULL OR EXISTS (
                     SELECT 1 FROM jsonb_array_elements(s.staff) x, jsonb_array_elements_text(x->'names') n
                     WHERE n = $1))
             AND ($2::text IS NULL OR EXISTS (
                     SELECT 1 FROM lyrics l WHERE l.song_id = s.id AND $2 = ANY(l.languages)))
             AND ($3::uuid IS NULL OR sp.song_id IS NOT NULL)
             AND ($4::text IS NULL OR s.title ILIKE $4)
             AND ($5::uuid IS NULL OR s.created_by = $5)
           ORDER BY sp.position, s.updated_at DESC, s.id
           LIMIT $6 OFFSET $7"#,
        staff,
        language,
        filter.playlist as Option<PlaylistId>,
        q,
        owner as Option<UserId>,
        page.limit(),
        page.offset(),
    )
    .fetch_all(&state.pool)
    .await?;
    let total = match rows.first() {
        Some(row) => row.total,
        // 这一页为空时窗口函数拿不到总数，单独数一次
        None => count(state, staff, language, filter.playlist, q.as_deref(), owner).await?,
    };
    let ids: Vec<SongId> = rows.into_iter().map(|row| row.id).collect();
    Ok(Json(Page::new(songs::summaries(state, &ids).await?, page, total)))
}

#[allow(clippy::too_many_arguments)]
async fn count(
    state: &AppState,
    staff: Option<&str>,
    language: Option<&str>,
    playlist: Option<PlaylistId>,
    q: Option<&str>,
    owner: Option<UserId>,
) -> AppResult<i64> {
    Ok(sqlx::query_scalar!(
        r#"SELECT count(*) AS "n!" FROM songs s
           WHERE ($1::text IS NULL OR EXISTS (
                     SELECT 1 FROM jsonb_array_elements(s.staff) x, jsonb_array_elements_text(x->'names') n
                     WHERE n = $1))
             AND ($2::text IS NULL OR EXISTS (
                     SELECT 1 FROM lyrics l WHERE l.song_id = s.id AND $2 = ANY(l.languages)))
             AND ($3::uuid IS NULL OR EXISTS (
                     SELECT 1 FROM song_playlists sp WHERE sp.song_id = s.id AND sp.playlist_id = $3))
             AND ($4::text IS NULL OR s.title ILIKE $4)
             AND ($5::uuid IS NULL OR s.created_by = $5)"#,
        staff,
        language,
        playlist as Option<PlaylistId>,
        q,
        owner as Option<UserId>,
    )
    .fetch_one(&state.pool)
    .await?)
}

async fn random(State(state): State<AppState>, _view: CanView) -> AppResult<Json<Vec<SongSummary>>> {
    let ids = sqlx::query_scalar!(
        r#"SELECT id AS "id: SongId" FROM songs ORDER BY random() LIMIT $1"#,
        RANDOM_COUNT
    )
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(songs::summaries(&state, &ids).await?))
}

/// 全部歌曲的精简列表，按标题排序
async fn options(State(state): State<AppState>, _view: CanView) -> AppResult<Json<Vec<SongOption>>> {
    Ok(Json(
        sqlx::query_as!(
            SongOption,
            r#"SELECT id AS "id: SongId", title FROM songs ORDER BY title, id"#
        )
        .fetch_all(&state.pool)
        .await?,
    ))
}

async fn detail(
    State(state): State<AppState>,
    _view: CanView,
    Path(id): Path<SongId>,
) -> AppResult<Json<SongDetail>> {
    Ok(Json(songs::detail(&state, id).await?.ok_or(AppError::NotFound)?))
}

async fn input(
    State(state): State<AppState>,
    auth: Auth<Upload>,
    Path(id): Path<SongId>,
) -> AppResult<Json<SongInput>> {
    require_owner_or_admin(&auth.user, songs::owner(&state, id).await?)?;
    Ok(Json(songs::input(&state, id).await?.ok_or(AppError::NotFound)?))
}

async fn create(
    State(state): State<AppState>,
    auth: Auth<Upload>,
    Json(input): Json<NewSong>,
) -> AppResult<(StatusCode, Json<SongDetail>)> {
    let id = write::create(&state, input, &auth.user).await?;
    let song = songs::detail(&state, id).await?.ok_or(AppError::NotFound)?;
    Ok((StatusCode::CREATED, Json(song)))
}

async fn replace(
    State(state): State<AppState>,
    auth: Auth<Upload>,
    Path(id): Path<SongId>,
    Json(input): Json<SongInput>,
) -> AppResult<Json<SongDetail>> {
    require_owner_or_admin(&auth.user, songs::owner(&state, id).await?)?;
    write::replace(&state, id, input).await?;
    Ok(Json(songs::detail(&state, id).await?.ok_or(AppError::NotFound)?))
}

async fn remove(
    State(state): State<AppState>,
    auth: Auth<Upload>,
    Path(id): Path<SongId>,
) -> AppResult<StatusCode> {
    require_owner_or_admin(&auth.user, songs::owner(&state, id).await?)?;
    let deleted = sqlx::query!("DELETE FROM songs WHERE id = $1", id as SongId)
        .execute(&state.pool)
        .await?
        .rows_affected();
    if deleted == 0 {
        return Err(AppError::NotFound);
    }
    Ok(StatusCode::NO_CONTENT)
}
