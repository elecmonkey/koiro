mod support;

use axum::http::StatusCode;
use serde_json::json;
use sqlx::PgPool;
use support::{app, create_playlist, create_song, insert_user, send};

const VIEW: i32 = 1;
const DOWNLOAD: i32 = 2;
const UPLOAD: i32 = 4;
const ADMIN: i32 = 8;
const UPLOADER: i32 = VIEW | DOWNLOAD | UPLOAD;
const FULL_ADMIN: i32 = VIEW | DOWNLOAD | UPLOAD | ADMIN;

#[sqlx::test]
async fn only_owner_or_admin_can_edit_or_delete_playlist(pool: PgPool) {
    let (router, state) = app(pool.clone());
    let owner = insert_user(&pool, "owner@test.koiro", UPLOADER).await;
    let other = insert_user(&pool, "other@test.koiro", UPLOADER).await;
    let admin = insert_user(&pool, "admin@test.koiro", FULL_ADMIN).await;

    let playlist = create_playlist(&router, &state, owner, "我的歌单").await;
    let id = playlist["id"].as_str().unwrap();

    let (status, _) = send(
        &router,
        "PATCH",
        &format!("/playlists/{id}"),
        Some((&state, other)),
        Some(json!({ "name": "改个名" })),
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN, "非创建者、非 ADMIN 不能改");

    let (status, body) = send(
        &router,
        "PATCH",
        &format!("/playlists/{id}"),
        Some((&state, owner)),
        Some(json!({ "name": "改个名" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "创建者本人能改");
    assert_eq!(body["name"], "改个名");

    let (status, _) = send(
        &router,
        "PATCH",
        &format!("/playlists/{id}"),
        Some((&state, admin)),
        Some(json!({ "name": "管理员改的名" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "ADMIN 能改任何人的");

    let (status, _) = send(
        &router,
        "DELETE",
        &format!("/playlists/{id}"),
        Some((&state, other)),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN, "非创建者、非 ADMIN 不能删");

    let (status, _) = send(
        &router,
        "DELETE",
        &format!("/playlists/{id}"),
        Some((&state, owner)),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::NO_CONTENT, "创建者本人能删");
}

#[sqlx::test]
async fn mine_options_only_returns_own_playlists_unless_admin(pool: PgPool) {
    let (router, state) = app(pool.clone());
    let owner = insert_user(&pool, "owner@test.koiro", UPLOADER).await;
    let other = insert_user(&pool, "other@test.koiro", UPLOADER).await;
    let admin = insert_user(&pool, "admin@test.koiro", FULL_ADMIN).await;

    create_playlist(&router, &state, owner, "owner 的歌单").await;
    create_playlist(&router, &state, other, "other 的歌单").await;

    let (status, body) = send(
        &router,
        "GET",
        "/playlists/mine/options",
        Some((&state, owner)),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let names: Vec<&str> = body
        .as_array()
        .unwrap()
        .iter()
        .map(|item| item["name"].as_str().unwrap())
        .collect();
    assert_eq!(names, ["owner 的歌单"], "非 ADMIN 只看到自己的歌单");

    let (status, body) = send(
        &router,
        "GET",
        "/playlists/mine/options",
        Some((&state, admin)),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let mut names: Vec<&str> = body
        .as_array()
        .unwrap()
        .iter()
        .map(|item| item["name"].as_str().unwrap())
        .collect();
    names.sort_unstable();
    assert_eq!(names, ["other 的歌单", "owner 的歌单"], "ADMIN 看到全部歌单");
}

#[sqlx::test]
async fn adding_songs_requires_owning_the_playlist_not_the_song(pool: PgPool) {
    let (router, state) = app(pool.clone());
    let owner = insert_user(&pool, "owner@test.koiro", UPLOADER).await;
    let other = insert_user(&pool, "other@test.koiro", UPLOADER).await;

    let playlist = create_playlist(&router, &state, owner, "owner 的歌单").await;
    let playlist_id = playlist["id"].as_str().unwrap().to_owned();
    // 歌是 other 建的，不是 owner 的；规则是「歌不需要是自己的，只要是自己的歌单就能加」
    let (status, song) = create_song(&router, &state, other, "other 的歌", &[]).await;
    assert_eq!(status, StatusCode::CREATED);
    let song_id = song["id"].as_str().unwrap().to_owned();

    let (status, _) = send(
        &router,
        "POST",
        &format!("/playlists/{playlist_id}/songs"),
        Some((&state, other)),
        Some(json!({ "songIds": [song_id] })),
    )
    .await;
    assert_eq!(
        status,
        StatusCode::FORBIDDEN,
        "other 不是这个歌单的创建者，不能往里加歌"
    );

    let (status, body) = send(
        &router,
        "POST",
        &format!("/playlists/{playlist_id}/songs"),
        Some((&state, owner)),
        Some(json!({ "songIds": [song_id] })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "owner 加别人的歌到自己的歌单：应该成功");
    assert_eq!(body["added"], 1);
}
