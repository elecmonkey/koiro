mod support;

use axum::http::StatusCode;
use sqlx::PgPool;
use support::{app, create_playlist, insert_user, send};

const VIEW: i32 = 1;
const DOWNLOAD: i32 = 2;
const UPLOAD: i32 = 4;
const ADMIN: i32 = 8;
const UPLOADER: i32 = VIEW | DOWNLOAD | UPLOAD;
const FULL_ADMIN: i32 = VIEW | DOWNLOAD | UPLOAD | ADMIN;

#[sqlx::test]
async fn cannot_delete_a_user_who_still_owns_content(pool: PgPool) {
    let (router, state) = app(pool.clone());
    let admin = insert_user(&pool, "admin@test.koiro", FULL_ADMIN).await;
    let target = insert_user(&pool, "target@test.koiro", UPLOADER).await;
    create_playlist(&router, &state, target, "target 的歌单").await;

    let (status, body) = send(
        &router,
        "DELETE",
        &format!("/users/{target}"),
        Some((&state, admin)),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::CONFLICT, "还有自己创建的歌单，不能删");
    assert_eq!(body["code"], "conflict");
}

#[sqlx::test]
async fn deleting_a_user_without_content_succeeds(pool: PgPool) {
    let (router, state) = app(pool.clone());
    let admin = insert_user(&pool, "admin@test.koiro", FULL_ADMIN).await;
    let target = insert_user(&pool, "target@test.koiro", UPLOADER).await;

    let (status, _) = send(
        &router,
        "DELETE",
        &format!("/users/{target}"),
        Some((&state, admin)),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::NO_CONTENT);
}

#[sqlx::test]
async fn admin_cannot_delete_self(pool: PgPool) {
    let (router, state) = app(pool.clone());
    let admin = insert_user(&pool, "admin@test.koiro", FULL_ADMIN).await;

    let (status, _) = send(
        &router,
        "DELETE",
        &format!("/users/{admin}"),
        Some((&state, admin)),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}
