//! 命令行登录：浏览器确认 + 回环地址回调 + 一次性授权码 + S256 PKCE
//!
//! 1. CLI 在 127.0.0.1 上监听，打开站点的 /auth/cli 页面
//! 2. 已登录用户在页面上确认，前端调 authorize 拿到带授权码的回调地址并跳转过去
//! 3. CLI 用授权码 + code_verifier 调 exchange，换取与网页登录同一种 JWT

use axum::{
    Json, Router,
    extract::{DefaultBodyLimit, State},
    http::{HeaderValue, header},
    middleware,
    response::Response,
    routing::post,
};
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use url::Url;

use crate::{
    auth::{Auth, LoggedIn, cli_codes::CliGrant, session},
    error::{AppError, AppResult},
    state::AppState,
    users::UserInfo,
};

/// 命令行登录的有效期（天）
const CLI_TOKEN_TTL_DAYS: i64 = 30;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/auth/cli/authorize", post(authorize))
        .route("/auth/cli/exchange", post(exchange))
        .layer(DefaultBodyLimit::max(4096))
        .layer(middleware::map_response(no_store))
}

async fn no_store(mut response: Response) -> Response {
    response
        .headers_mut()
        .insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
    response
}

fn digest(value: &str) -> String {
    URL_SAFE_NO_PAD.encode(Sha256::digest(value.as_bytes()))
}

fn is_random_hex(value: &str) -> bool {
    value.len() == 64
        && value
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}

/// 只接受规范的 `http://127.0.0.1:<端口>/callback`，杜绝任意跳转
fn redirect_uri(value: &str) -> AppResult<Url> {
    let invalid = || AppError::BadRequest("无效的回调地址".into());
    let url = Url::parse(value).map_err(|_| invalid())?;
    if url.scheme() != "http"
        || url.host_str() != Some("127.0.0.1")
        || url.port().is_none_or(|port| port == 0)
        || url.path() != "/callback"
        || url.query().is_some()
        || url.fragment().is_some()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.as_str() != value
    {
        return Err(invalid());
    }
    Ok(url)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AuthorizeBody {
    redirect_uri: String,
    state: String,
    code_challenge: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AuthorizeResponse {
    callback_url: String,
}

async fn authorize(
    State(state): State<AppState>,
    auth: Auth<LoggedIn>,
    Json(body): Json<AuthorizeBody>,
) -> AppResult<Json<AuthorizeResponse>> {
    // 停用的账号（权限为 0）不签发命令行登录
    if auth.permissions == 0 {
        return Err(AppError::Forbidden);
    }
    let mut callback = redirect_uri(&body.redirect_uri)?;
    if !is_random_hex(&body.state)
        || URL_SAFE_NO_PAD
            .decode(&body.code_challenge)
            .ok()
            .is_none_or(|bytes| bytes.len() != 32)
    {
        return Err(AppError::BadRequest("无效的 state 或 code_challenge".into()));
    }
    let password_hash = sqlx::query_scalar!("SELECT password_hash FROM users WHERE id = $1", auth.id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(AppError::Unauthorized("Unauthorized"))?;

    let code = hex::encode(rand::random::<[u8; 32]>());
    state.cli_codes.insert(
        digest(&code),
        CliGrant {
            user_id: auth.id,
            credential_fingerprint: digest(&password_hash),
            code_challenge: body.code_challenge,
            redirect_uri: body.redirect_uri,
        },
    )?;
    callback
        .query_pairs_mut()
        .append_pair("code", &code)
        .append_pair("state", &body.state);
    Ok(Json(AuthorizeResponse {
        callback_url: callback.into(),
    }))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExchangeBody {
    code: String,
    code_verifier: String,
    redirect_uri: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ExchangeResponse {
    token: String,
    expires_at: DateTime<Utc>,
    user: UserInfo,
}

async fn exchange(
    State(state): State<AppState>,
    Json(body): Json<ExchangeBody>,
) -> AppResult<Json<ExchangeResponse>> {
    let invalid = || AppError::Unauthorized("授权码无效或已过期");
    redirect_uri(&body.redirect_uri)?;
    if !is_random_hex(&body.code)
        || !(43..=128).contains(&body.code_verifier.len())
        || !body
            .code_verifier
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b"-._~".contains(&b))
    {
        return Err(invalid());
    }
    // 授权码一经消费即作废，兑换失败也不会恢复
    let grant = state.cli_codes.consume(
        &digest(&body.code),
        &digest(&body.code_verifier),
        &body.redirect_uri,
    )?;

    let password_hash = sqlx::query_scalar!("SELECT password_hash FROM users WHERE id = $1", grant.user_id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or_else(invalid)?;
    if digest(&password_hash) != grant.credential_fingerprint {
        return Err(invalid());
    }
    let user = state.users.get(grant.user_id).await?.ok_or_else(invalid)?;
    if user.permissions == 0 {
        return Err(AppError::Forbidden);
    }
    let issued = session::issue_token(&state, grant.user_id, CLI_TOKEN_TTL_DAYS)?;
    Ok(Json(ExchangeResponse {
        token: issued.token,
        expires_at: issued.expires_at,
        user: UserInfo::clone(&user),
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pkce_matches_rfc7636_vector() {
        assert_eq!(
            digest("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
            "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
        );
    }

    #[test]
    fn only_canonical_loopback_callbacks_are_allowed() {
        assert!(redirect_uri("http://127.0.0.1:56333/callback").is_ok());
        for value in [
            "https://evil.test/callback",
            "http://localhost:56333/callback",
            "http://127.0.0.1:0/callback",
            "http://127.0.0.1/callback",
            "http://127.0.0.1:56333/callback?x=1",
            "http://127.0.0.1:56333/callback#x",
            "http://user@127.0.0.1:56333/callback",
            "http://127.1:56333/callback",
            "http://127.0.0.1:56333/other",
        ] {
            assert!(redirect_uri(value).is_err(), "{value}");
        }
    }
}
