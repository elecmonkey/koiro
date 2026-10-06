#![allow(dead_code)]

//! 集成测试共用的小工具：起一份 `AppState`/`Router`，签发测试用的 token，收发 JSON 请求。
//! `#[sqlx::test]` 给每个测试函数一个全新的临时数据库，这里只负责把它接到一个完整的
//! `AppState` 上，不处理对象存储——用到的 key 只要满足 `img/`、`music/` 前缀的字符串
//! 校验即可，不会真的发 S3 请求。

use axum::{
    Router,
    body::Body,
    http::{Request, StatusCode, header},
};
use http_body_util::BodyExt;
use koiro_server::{
    api::UserId,
    auth::session,
    config::{Config, S3Config},
    state::AppState,
};
use serde_json::{Value, json};
use sqlx::PgPool;
use tower::ServiceExt;

fn test_config() -> Config {
    Config {
        bind: "127.0.0.1:0".into(),
        database_url: String::new(),
        auth_secret: "integration-test-secret-needs-32-chars".into(),
        allow_anonymous: false,
        cookie_secure: false,
        s3: S3Config {
            endpoint: "http://localhost:9000".into(),
            region: "us-east-1".into(),
            bucket: "koiro-test".into(),
            access_key_id: "test".into(),
            secret_access_key: "test".into(),
            force_path_style: true,
            prefix: String::new(),
            public_url: "http://localhost:9000/koiro-test".into(),
        },
    }
}

/// 一份可用的 `AppState`，以及拿同一份状态签出来的 `Router`
pub fn app(pool: PgPool) -> (Router, AppState) {
    let state = AppState::new(pool, test_config()).expect("construct AppState");
    let router = koiro_server::routes::router().with_state(state.clone());
    (router, state)
}

/// `img/`/`music/` 前缀下的占位 key，能通过 `is_image_key`/`is_audio_key` 的字符串校验
pub fn fake_image_key() -> String {
    "img/test-cover.jpg".into()
}

pub fn fake_audio_key() -> String {
    "music/test-audio.mp3".into()
}

/// 插入一个测试用户，返回其 id；密码哈希是占位值，这批测试不走登录接口
pub async fn insert_user(pool: &PgPool, email: &str, permission_bits: i32) -> UserId {
    sqlx::query_scalar!(
        r#"INSERT INTO users (email, display_name, password_hash, permissions)
           VALUES ($1, $1, 'not-a-real-hash', $2)
           RETURNING id AS "id: UserId""#,
        email,
        permission_bits,
    )
    .fetch_one(pool)
    .await
    .expect("insert test user")
}

/// 直接签一个会话 token，拼成 `Authorization: Bearer` 头
fn bearer(state: &AppState, user_id: UserId) -> (header::HeaderName, header::HeaderValue) {
    let token = session::issue_token(state, user_id, 1)
        .expect("issue token")
        .token;
    (
        header::AUTHORIZATION,
        header::HeaderValue::from_str(&format!("Bearer {token}")).expect("valid header value"),
    )
}

/// 发一个请求，可选以某个用户的身份、可选带 JSON body；返回状态码和解析后的 JSON body
/// （空响应体返回 `Value::Null`）
pub async fn send(
    router: &Router,
    method: &str,
    uri: &str,
    auth: Option<(&AppState, UserId)>,
    body: Option<Value>,
) -> (StatusCode, Value) {
    let mut builder = Request::builder().method(method).uri(uri);
    if let Some((state, user_id)) = auth {
        let (name, value) = bearer(state, user_id);
        builder = builder.header(name, value);
    }
    let request = match body {
        Some(body) => builder
            .header(header::CONTENT_TYPE, "application/json")
            .body(Body::from(serde_json::to_vec(&body).expect("serialize body")))
            .expect("build request"),
        None => builder.body(Body::empty()).expect("build request"),
    };
    let response = router.clone().oneshot(request).await.expect("call router");
    let status = response.status();
    let bytes = response
        .into_body()
        .collect()
        .await
        .expect("collect body")
        .to_bytes();
    let json = if bytes.is_empty() {
        Value::Null
    } else {
        serde_json::from_slice(&bytes).expect("parse JSON body")
    };
    (status, json)
}

/// 建一个歌单，返回解析后的 `Playlist`；非 2xx 直接 panic（这是测试准备阶段，不是被测路径）
pub async fn create_playlist(router: &Router, state: &AppState, caller: UserId, name: &str) -> Value {
    let (status, body) = send(
        router,
        "POST",
        "/playlists",
        Some((state, caller)),
        Some(json!({ "name": name, "description": "", "coverObjectId": fake_image_key() })),
    )
    .await;
    assert_eq!(status, StatusCode::CREATED, "create_playlist failed: {body}");
    body
}

/// 建一首歌，`playlist_ids` 为创建后要加入的歌单 id（字符串形式的 uuid）
pub async fn create_song(
    router: &Router,
    state: &AppState,
    caller: UserId,
    title: &str,
    playlist_ids: &[String],
) -> (StatusCode, Value) {
    send(
        router,
        "POST",
        "/songs",
        Some((state, caller)),
        Some(json!({
            "title": title,
            "description": "",
            "coverObjectId": fake_image_key(),
            "staff": [],
            "versions": [{
                "name": "主版本",
                "objectId": fake_audio_key(),
                "isDefault": true,
                "lyricsName": null,
            }],
            "lyrics": [],
            "playlistIds": playlist_ids,
        })),
    )
    .await
}
