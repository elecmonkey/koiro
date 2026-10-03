//! 会话 = JWT（HS256，claims 只有 sub / iat / exp）。
//! 浏览器放在 HttpOnly cookie 里；命令行用 `Authorization: Bearer` 携带同一种 token。

use axum::http::{HeaderMap, header};
use axum_extra::extract::cookie::{Cookie, CookieJar, SameSite};
use chrono::{DateTime, Duration, Utc};
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

pub struct IssuedToken {
    pub token: String,
    pub expires_at: DateTime<Utc>,
}

pub fn issue_token(state: &AppState, user_id: Uuid, ttl_days: i64) -> anyhow::Result<IssuedToken> {
    let now = Utc::now();
    let expires_at = now + Duration::days(ttl_days);
    let claims = Claims {
        sub: user_id,
        iat: now.timestamp(),
        exp: expires_at.timestamp(),
    };
    let token = encode(&Header::new(Algorithm::HS256), &claims, &state.jwt.encoding)?;
    Ok(IssuedToken { token, expires_at })
}

pub fn issue_cookie(state: &AppState, user_id: Uuid, ttl_days: i64) -> anyhow::Result<Cookie<'static>> {
    let issued = issue_token(state, user_id, ttl_days)?;
    let mut cookie = build_cookie(state, issued.token);
    cookie.set_max_age(time::Duration::days(ttl_days));
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

/// 从 `Authorization: Bearer` 或会话 cookie 中解出用户 id（Bearer 优先）；
/// token 缺失、签名不符或已过期都视为未登录
pub fn user_id_from_headers(headers: &HeaderMap, state: &AppState) -> Option<Uuid> {
    let bearer = headers
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "));
    let jar;
    let token = match bearer {
        Some(token) => token,
        None => {
            jar = CookieJar::from_headers(headers);
            jar.get(COOKIE_NAME)?.value()
        }
    };
    let validation = Validation::new(Algorithm::HS256);
    decode::<Claims>(token, &state.jwt.decoding, &validation)
        .ok()
        .map(|data| data.claims.sub)
}
