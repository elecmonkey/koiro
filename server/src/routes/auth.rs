use std::net::SocketAddr;

use axum::{
    Json, Router,
    extract::{ConnectInfo, State},
    http::HeaderMap,
    routing::{get, post},
};
use axum_extra::extract::CookieJar;
use serde::{Deserialize, Serialize};

use crate::{
    auth::{MaybeUser, login_limit::client_ip, session},
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
    ConnectInfo(peer): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    jar: CookieJar,
    Json(body): Json<LoginBody>,
) -> AppResult<(CookieJar, Json<MeResponse>)> {
    if !session::ALLOWED_TTL_DAYS.contains(&body.ttl_days) {
        return Err(AppError::BadRequest("Invalid ttlDays".into()));
    }
    let email = body.email.trim().to_owned();
    // 失败过多时在查库、哈希之前就拒绝
    let ip = client_ip(peer, &headers);
    state.login_limit.begin(ip).await?;

    let row = sqlx::query!("SELECT id, password_hash FROM users WHERE email = $1", email)
        .fetch_optional(&state.pool)
        .await?;
    let (id, stored) = row.map(|row| (row.id, row.password_hash)).unzip();
    let valid = state.hasher.verify_login(body.password, stored).await?;
    let user_id = id.filter(|_| valid);
    if user_id.is_some() {
        state.login_limit.succeeded(ip).await;
    }

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
