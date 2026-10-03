use axum::{
    Json, Router,
    extract::{Path, Query, State},
    routing::{get, patch},
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::common::{OK, Ok, Pagination, SearchPageQuery};
use crate::{
    auth::{Admin, Auth, LoggedIn, hash_password, verify_password},
    error::{AppError, AppResult},
    state::AppState,
    users::UserInfo,
};

const PAGE_SIZE: i64 = 10;
const MAX_PERMISSIONS: i32 = 15;
const MIN_PASSWORD_LEN: usize = 6;
const MAX_DISPLAY_NAME_LEN: usize = 50;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/admin/users", get(list).post(create))
        .route("/admin/users/{id}", patch(update).delete(remove))
        .route("/profile", get(profile).patch(update_profile))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct UserRow {
    id: Uuid,
    email: String,
    display_name: String,
    permissions: i32,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct UserPage {
    users: Vec<UserRow>,
    pagination: Pagination,
}

async fn list(
    State(state): State<AppState>,
    _auth: Auth<Admin>,
    Query(query): Query<SearchPageQuery>,
) -> AppResult<Json<UserPage>> {
    let pattern = query.like_pattern();
    let total = sqlx::query_scalar!(
        r#"SELECT count(*) AS "n!" FROM users WHERE email ILIKE $1 OR display_name ILIKE $1"#,
        pattern
    )
    .fetch_one(&state.pool)
    .await?;
    let users = sqlx::query_as!(
        UserRow,
        r#"SELECT id, email, display_name, permissions, created_at, updated_at FROM users
           WHERE email ILIKE $1 OR display_name ILIKE $1
           ORDER BY created_at DESC, id LIMIT $2 OFFSET $3"#,
        pattern,
        PAGE_SIZE,
        query.offset(PAGE_SIZE)
    )
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(UserPage {
        users,
        pagination: Pagination::new(query.page(), PAGE_SIZE, total),
    }))
}

fn check_permissions(value: i32) -> AppResult<()> {
    if !(0..=MAX_PERMISSIONS).contains(&value) {
        return Err(AppError::BadRequest("无效的权限值".into()));
    }
    Ok(())
}

fn check_password(password: &str) -> AppResult<()> {
    if password.chars().count() < MIN_PASSWORD_LEN {
        return Err(AppError::BadRequest(format!("密码至少 {MIN_PASSWORD_LEN} 位")));
    }
    Ok(())
}

fn normalize_display_name(name: &str) -> AppResult<String> {
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

/// scrypt 很耗 CPU，放到阻塞线程池
async fn hash(password: String) -> AppResult<String> {
    Ok(tokio::task::spawn_blocking(move || hash_password(&password))
        .await
        .map_err(anyhow::Error::from)?)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateBody {
    email: String,
    password: String,
    permissions: i32,
    display_name: Option<String>,
}

#[derive(Serialize)]
struct CreatedUser {
    user: UserRow,
}

async fn create(
    State(state): State<AppState>,
    _auth: Auth<Admin>,
    Json(body): Json<CreateBody>,
) -> AppResult<Json<CreatedUser>> {
    let email = body.email.trim().to_owned();
    if email.is_empty() {
        return Err(AppError::BadRequest("邮箱不能为空".into()));
    }
    check_password(&body.password)?;
    check_permissions(body.permissions)?;
    let display_name = match body.display_name.as_deref().map(str::trim) {
        Some(name) if !name.is_empty() => normalize_display_name(name)?,
        _ => email.clone(),
    };
    let password_hash = hash(body.password).await?;

    // 新用户不在缓存中，首次访问时按需加载
    let user = sqlx::query_as!(
        UserRow,
        r#"INSERT INTO users (email, display_name, password_hash, permissions) VALUES ($1, $2, $3, $4)
           ON CONFLICT (email) DO NOTHING
           RETURNING id, email, display_name, permissions, created_at, updated_at"#,
        email,
        display_name,
        password_hash,
        body.permissions
    )
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::BadRequest("该邮箱已被注册".into()))?;
    Ok(Json(CreatedUser { user }))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateBody {
    permissions: Option<i32>,
    password: Option<String>,
    display_name: Option<String>,
}

async fn update(
    State(state): State<AppState>,
    auth: Auth<Admin>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateBody>,
) -> AppResult<Json<Ok>> {
    if let Some(permissions) = body.permissions {
        check_permissions(permissions)?;
        if id == auth.id {
            return Err(AppError::BadRequest("不能修改自己的权限".into()));
        }
    }
    let password_hash = match body.password {
        Some(password) => {
            check_password(&password)?;
            Some(hash(password).await?)
        }
        None => None,
    };
    let display_name = body
        .display_name
        .as_deref()
        .map(normalize_display_name)
        .transpose()?;
    if body.permissions.is_none() && password_hash.is_none() && display_name.is_none() {
        return Err(AppError::BadRequest("没有提供要更新的内容".into()));
    }

    let pool = state.pool.clone();
    let user = state
        .users
        .write(id, || async move {
            Ok(sqlx::query_as!(
                UserInfo,
                r#"UPDATE users SET
                       permissions = COALESCE($2, permissions),
                       password_hash = COALESCE($3, password_hash),
                       display_name = COALESCE($4, display_name)
                   WHERE id = $1
                   RETURNING id, email, display_name, permissions"#,
                id,
                body.permissions,
                password_hash,
                display_name
            )
            .fetch_optional(&pool)
            .await?)
        })
        .await?;
    user.ok_or(AppError::NotFound)?;
    Ok(Json(OK))
}

async fn remove(
    State(state): State<AppState>,
    auth: Auth<Admin>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Ok>> {
    if id == auth.id {
        return Err(AppError::BadRequest("不能删除自己".into()));
    }
    let pool = state.pool.clone();
    let mut deleted = false;
    state
        .users
        .write(id, || async {
            deleted = sqlx::query!("DELETE FROM users WHERE id = $1", id)
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
    Ok(Json(OK))
}

#[derive(Serialize)]
struct ProfileResponse {
    user: UserRow,
}

async fn profile(State(state): State<AppState>, auth: Auth<LoggedIn>) -> AppResult<Json<ProfileResponse>> {
    let user = sqlx::query_as!(
        UserRow,
        "SELECT id, email, display_name, permissions, created_at, updated_at FROM users WHERE id = $1",
        auth.id
    )
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;
    Ok(Json(ProfileResponse { user }))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProfileBody {
    display_name: Option<String>,
    current_password: Option<String>,
    new_password: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProfileUpdated {
    ok: bool,
    user: UserInfo,
}

/// 修改自己的昵称，或验证当前密码后修改密码
async fn update_profile(
    State(state): State<AppState>,
    auth: Auth<LoggedIn>,
    Json(body): Json<ProfileBody>,
) -> AppResult<Json<ProfileUpdated>> {
    let id = auth.id;
    let display_name = body
        .display_name
        .as_deref()
        .map(normalize_display_name)
        .transpose()?;
    let password_hash = match body.new_password {
        Some(new_password) => {
            let current = body
                .current_password
                .filter(|p| !p.is_empty())
                .ok_or_else(|| AppError::BadRequest("请输入当前密码".into()))?;
            let stored = sqlx::query_scalar!("SELECT password_hash FROM users WHERE id = $1", id)
                .fetch_one(&state.pool)
                .await?;
            let valid = tokio::task::spawn_blocking(move || verify_password(&current, &stored))
                .await
                .map_err(anyhow::Error::from)?;
            if !valid {
                return Err(AppError::BadRequest("当前密码错误".into()));
            }
            check_password(&new_password)?;
            Some(hash(new_password).await?)
        }
        None => None,
    };
    if display_name.is_none() && password_hash.is_none() {
        return Err(AppError::BadRequest("没有提供要更新的内容".into()));
    }

    let pool = state.pool.clone();
    let user = state
        .users
        .write(id, || async move {
            Ok(sqlx::query_as!(
                UserInfo,
                r#"UPDATE users SET
                       display_name = COALESCE($2, display_name),
                       password_hash = COALESCE($3, password_hash)
                   WHERE id = $1
                   RETURNING id, email, display_name, permissions"#,
                id,
                display_name,
                password_hash
            )
            .fetch_optional(&pool)
            .await?)
        })
        .await?
        .ok_or(AppError::NotFound)?;
    Ok(Json(ProfileUpdated {
        ok: true,
        user: UserInfo::clone(&user),
    }))
}
