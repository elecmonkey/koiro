use std::net::SocketAddr;

use axum::{
    Router,
    extract::{ConnectInfo, State},
    http::{HeaderMap, StatusCode},
    routing::{get, post},
};
use axum_extra::extract::CookieJar;

use super::extract::Json;
use crate::{
    api::{LoginRequest, Session, UserId},
    auth::{MaybeUser, login_limit::client_ip, session},
    error::{AppError, AppResult},
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/auth/login", post(login))
        .route("/auth/logout", post(logout))
        .route("/auth/session", get(current_session))
}

async fn login(
    State(state): State<AppState>,
    ConnectInfo(peer): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    jar: CookieJar,
    Json(body): Json<LoginRequest>,
) -> AppResult<(CookieJar, Json<Session>)> {
    if !session::ALLOWED_TTL_DAYS.contains(&body.ttl_days) {
        return Err(AppError::BadRequest("登录有效期只能是 1、7、30 或 180 天".into()));
    }
    let email = body.email.trim();
    // 失败过多时在查库、哈希之前就拒绝
    let ip = client_ip(peer, &headers);
    state.login_limit.begin(ip).await?;

    let row = sqlx::query!(
        r#"SELECT id AS "id: UserId", password_hash FROM users WHERE email = $1"#,
        email
    )
    .fetch_optional(&state.pool)
    .await?;
    let (id, stored) = row.map(|row| (row.id, row.password_hash)).unzip();
    let valid = state.hasher.verify_login(body.password, stored).await?;
    let user = match id.filter(|_| valid) {
        Some(id) => state.users.get(id).await?,
        None => None,
    };
    let user = user.ok_or(AppError::Unauthorized("邮箱或密码错误"))?;
    state.login_limit.succeeded(ip).await;

    let cookie = session::issue_cookie(&state, user.id, body.ttl_days)?;
    Ok((
        jar.add(cookie),
        Json(Session {
            user: Some(user.to_api(&state)),
            allow_anonymous: state.config.allow_anonymous,
        }),
    ))
}

async fn logout(State(state): State<AppState>, jar: CookieJar) -> (CookieJar, StatusCode) {
    (jar.add(session::removal_cookie(&state)), StatusCode::NO_CONTENT)
}

async fn current_session(State(state): State<AppState>, MaybeUser(user): MaybeUser) -> Json<Session> {
    Json(Session {
        user: user.map(|user| user.to_api(&state)),
        allow_anonymous: state.config.allow_anonymous,
    })
}
