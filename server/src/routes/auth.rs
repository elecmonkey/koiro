use axum::{
    Json, Router,
    extract::State,
    routing::{get, post},
};
use axum_extra::extract::CookieJar;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    auth::{MaybeUser, session, verify_dummy, verify_password},
    error::{AppError, AppResult},
    state::AppState,
    users::UserInfo,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/auth/login", post(login))
        .route("/auth/logout", post(logout))
        .route("/me", get(me))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LoginBody {
    email: String,
    password: String,
    #[serde(default = "default_ttl_days")]
    ttl_days: i64,
}

fn default_ttl_days() -> i64 {
    7
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MeResponse {
    user: Option<UserInfo>,
    allow_anonymous: bool,
}

async fn login(
    State(state): State<AppState>,
    jar: CookieJar,
    Json(body): Json<LoginBody>,
) -> AppResult<(CookieJar, Json<MeResponse>)> {
    if !session::ALLOWED_TTL_DAYS.contains(&body.ttl_days) {
        return Err(AppError::BadRequest("Invalid ttlDays".into()));
    }
    let email = body.email.trim().to_owned();

    let row = sqlx::query!("SELECT id, password_hash FROM users WHERE email = $1", email)
        .fetch_optional(&state.pool)
        .await?;

    // scrypt 是 CPU/内存密集运算，放到阻塞线程池
    let password = body.password;
    let user_id: Option<Uuid> = tokio::task::spawn_blocking(move || match row {
        Some(row) => verify_password(&password, &row.password_hash).then_some(row.id),
        None => {
            verify_dummy(&password);
            None
        }
    })
    .await
    .map_err(anyhow::Error::from)?;

    let user_id = user_id.ok_or(AppError::Unauthorized("邮箱或密码错误"))?;
    let user = state
        .users
        .get(user_id)
        .await?
        .ok_or(AppError::Unauthorized("邮箱或密码错误"))?;

    let cookie = session::issue_cookie(&state, user_id, body.ttl_days)?;
    Ok((
        jar.add(cookie),
        Json(MeResponse {
            user: Some(UserInfo::clone(&user)),
            allow_anonymous: state.config.allow_anonymous,
        }),
    ))
}

async fn logout(State(state): State<AppState>, jar: CookieJar) -> CookieJar {
    jar.add(session::removal_cookie(&state))
}

async fn me(State(state): State<AppState>, MaybeUser(user): MaybeUser) -> Json<MeResponse> {
    Json(MeResponse {
        user: user.map(|u| UserInfo::clone(&u)),
        allow_anonymous: state.config.allow_anonymous,
    })
}
