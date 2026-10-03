//! 会话 = 存在 HttpOnly cookie 里的 JWT（HS256，claims 只有 sub / iat / exp）

use axum::http::HeaderMap;
use axum_extra::extract::cookie::{Cookie, CookieJar, SameSite};
use chrono::{Duration, Utc};
use jsonwebtoken::{Algorithm, Header, Validation, decode, encode};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::state::AppState;

pub const COOKIE_NAME: &str = "koiro_session";

/// 登录时可选的有效期（天）
pub const ALLOWED_TTL_DAYS: [i64; 4] = [1, 7, 30, 180];

#[derive(Serialize, Deserialize)]
struct Claims {
    sub: Uuid,
    iat: i64,
    exp: i64,
}

pub fn issue_cookie(state: &AppState, user_id: Uuid, ttl_days: i64) -> anyhow::Result<Cookie<'static>> {
    let now = Utc::now();
    let ttl = Duration::days(ttl_days);
    let claims = Claims {
        sub: user_id,
        iat: now.timestamp(),
        exp: (now + ttl).timestamp(),
    };
    let token = encode(&Header::new(Algorithm::HS256), &claims, &state.jwt.encoding)?;
    let mut cookie = build_cookie(state, token);
    cookie.set_max_age(time::Duration::seconds(ttl.num_seconds()));
    Ok(cookie)
}

pub fn removal_cookie(state: &AppState) -> Cookie<'static> {
    let mut cookie = build_cookie(state, String::new());
    cookie.make_removal();
    cookie
}

fn build_cookie(state: &AppState, value: String) -> Cookie<'static> {
    Cookie::build((COOKIE_NAME, value))
        .path("/")
        .http_only(true)
        .same_site(SameSite::Lax)
        .secure(state.config.cookie_secure)
        .build()
}

/// 从请求的 cookie 中解出用户 id；token 缺失、签名不符或已过期都视为未登录
pub fn user_id_from_headers(headers: &HeaderMap, state: &AppState) -> Option<Uuid> {
    let jar = CookieJar::from_headers(headers);
    let token = jar.get(COOKIE_NAME)?.value();
    let validation = Validation::new(Algorithm::HS256);
    decode::<Claims>(token, &state.jwt.decoding, &validation)
        .ok()
        .map(|data| data.claims.sub)
}
