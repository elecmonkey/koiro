use axum::{
    Router,
    extract::State,
    http::StatusCode,
    routing::{get, patch},
};

use super::extract::{Json, Path, Query};
use crate::{
    api::{Page, PageQuery, ProfilePatch, User, UserFilter, UserId, UserInput, UserPatch},
    auth::{Admin, Auth, LoggedIn, Permissions},
    db::like_pattern,
    error::{AppError, AppResult},
    state::AppState,
    users::{Account, AccountRow},
};

const MIN_PASSWORD_LEN: usize = 6;
const MAX_DISPLAY_NAME_LEN: usize = 50;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/users", get(list).post(create))
        .route("/users/{id}", patch(update).delete(remove))
        .route("/profile", get(profile).patch(update_profile))
}

fn check_password(password: &str) -> AppResult<()> {
    if password.chars().count() < MIN_PASSWORD_LEN {
        return Err(AppError::BadRequest(format!("密码至少 {MIN_PASSWORD_LEN} 位")));
    }
    Ok(())
}

fn checked_display_name(name: &str) -> AppResult<String> {
    let name = name.trim();
    if name.is_empty() {
        return Err(AppError::BadRequest("昵称不能为空".into()));
    }
    if name.chars().count() > MAX_DISPLAY_NAME_LEN {
        return Err(AppError::BadRequest(format!(
            "昵称不能超过 {MAX_DISPLAY_NAME_LEN} 个字符"
        )));
    }
    Ok(name.to_owned())
}

/// 按注册时间从新到旧；`q` 匹配邮箱或昵称
async fn list(
    State(state): State<AppState>,
    _auth: Auth<Admin>,
    Query(page): Query<PageQuery>,
    Query(filter): Query<UserFilter>,
) -> AppResult<Json<Page<User>>> {
    let pattern = like_pattern(filter.q.as_deref().unwrap_or_default());
    let total = sqlx::query_scalar!(
        r#"SELECT count(*) AS "n!" FROM users WHERE email ILIKE $1 OR display_name ILIKE $1"#,
        pattern
    )
    .fetch_one(&state.pool)
    .await?;
    let rows = sqlx::query_as!(
        AccountRow,
        r#"SELECT id AS "id: UserId", email, display_name, permissions, created_at, updated_at FROM users
           WHERE email ILIKE $1 OR display_name ILIKE $1
           ORDER BY created_at DESC, id LIMIT $2 OFFSET $3"#,
        pattern,
        page.limit(),
        page.offset()
    )
    .fetch_all(&state.pool)
    .await?;
    let users = rows.into_iter().map(|row| Account::from(row).to_api()).collect();
    Ok(Json(Page::new(users, &page, total)))
}

async fn create(
    State(state): State<AppState>,
    _auth: Auth<Admin>,
    Json(body): Json<UserInput>,
) -> AppResult<(StatusCode, Json<User>)> {
    let email = body.email.trim();
    if email.is_empty() {
        return Err(AppError::BadRequest("邮箱不能为空".into()));
    }
    let display_name = checked_display_name(&body.display_name)?;
    check_password(&body.password)?;
    let password_hash = state.hasher.hash(body.password).await?;
    // 新用户不在缓存中，首次访问时按需加载
    let row = sqlx::query_as!(
        AccountRow,
        r#"INSERT INTO users (email, display_name, password_hash, permissions) VALUES ($1, $2, $3, $4)
           ON CONFLICT (email) DO NOTHING
           RETURNING id AS "id: UserId", email, display_name, permissions, created_at, updated_at"#,
        email,
        display_name,
        password_hash,
        Permissions::from_list(&body.permissions).bits()
    )
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::Conflict("该邮箱已被注册".into()))?;
    Ok((StatusCode::CREATED, Json(Account::from(row).to_api())))
}

async fn update(
    State(state): State<AppState>,
    auth: Auth<Admin>,
    Path(id): Path<UserId>,
    Json(body): Json<UserPatch>,
) -> AppResult<Json<User>> {
    let permissions = body.permissions.as_deref().map(Permissions::from_list);
    if permissions.is_some() && id == auth.id {
        return Err(AppError::BadRequest("不能修改自己的权限".into()));
    }
    let display_name = body
        .display_name
        .as_deref()
        .map(checked_display_name)
        .transpose()?;
    let password_hash = match body.password {
        Some(password) => {
            check_password(&password)?;
            Some(state.hasher.hash(password).await?)
        }
        None => None,
    };
    // 什么都不改时不写库，避免无意义地刷新 updated_at
    if display_name.is_none() && password_hash.is_none() && permissions.is_none() {
        let user = state.users.get(id).await?.ok_or(AppError::NotFound)?;
        return Ok(Json(user.to_api()));
    }
    let pool = state.pool.clone();
    let user = state
        .users
        .write(id, || async move {
            let row = sqlx::query_as!(
                AccountRow,
                r#"UPDATE users SET
                       display_name = COALESCE($2, display_name),
                       password_hash = COALESCE($3, password_hash),
                       permissions = COALESCE($4, permissions)
                   WHERE id = $1
                   RETURNING id AS "id: UserId", email, display_name, permissions, created_at, updated_at"#,
                id as UserId,
                display_name,
                password_hash,
                permissions.map(Permissions::bits)
            )
            .fetch_optional(&pool)
            .await?;
            Ok(row.map(Account::from))
        })
        .await?
        .ok_or(AppError::NotFound)?;
    Ok(Json(user.to_api()))
}

async fn remove(
    State(state): State<AppState>,
    auth: Auth<Admin>,
    Path(id): Path<UserId>,
) -> AppResult<StatusCode> {
    if id == auth.id {
        return Err(AppError::BadRequest("不能删除自己".into()));
    }
    let pool = state.pool.clone();
    let mut deleted = false;
    state
        .users
        .write(id, || async {
            deleted = sqlx::query!("DELETE FROM users WHERE id = $1", id as UserId)
                .execute(&pool)
                .await?
                .rows_affected()
                > 0;
            Ok(None)
        })
        .await?;
    if !deleted {
        return Err(AppError::NotFound);
    }
    Ok(StatusCode::NO_CONTENT)
}

async fn profile(auth: Auth<LoggedIn>) -> Json<User> {
    Json(auth.to_api())
}

/// 修改自己的昵称，或验证当前密码后修改密码
async fn update_profile(
    State(state): State<AppState>,
    auth: Auth<LoggedIn>,
    Json(body): Json<ProfilePatch>,
) -> AppResult<Json<User>> {
    let id = auth.id;
    let display_name = body
        .display_name
        .as_deref()
        .map(checked_display_name)
        .transpose()?;
    let password_hash = match body.password {
        Some(change) => {
            let stored = sqlx::query_scalar!("SELECT password_hash FROM users WHERE id = $1", id as UserId)
                .fetch_one(&state.pool)
                .await?;
            if !state.hasher.verify(change.current, stored).await? {
                return Err(AppError::BadRequest("当前密码错误".into()));
            }
            check_password(&change.new)?;
            Some(state.hasher.hash(change.new).await?)
        }
        None => None,
    };
    if display_name.is_none() && password_hash.is_none() {
        return Ok(Json(auth.to_api()));
    }
    let pool = state.pool.clone();
    let user = state
        .users
        .write(id, || async move {
            let row = sqlx::query_as!(
                AccountRow,
                r#"UPDATE users SET
                       display_name = COALESCE($2, display_name),
                       password_hash = COALESCE($3, password_hash)
                   WHERE id = $1
                   RETURNING id AS "id: UserId", email, display_name, permissions, created_at, updated_at"#,
                id as UserId,
                display_name,
                password_hash
            )
            .fetch_optional(&pool)
            .await?;
            Ok(row.map(Account::from))
        })
        .await?
        .ok_or(AppError::NotFound)?;
    Ok(Json(user.to_api()))
}
