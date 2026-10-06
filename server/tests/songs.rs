mod support;

use axum::http::StatusCode;
use serde_json::json;
use sqlx::PgPool;
use support::{app, create_playlist, create_song, fake_audio_key, fake_image_key, insert_user, send};

const VIEW: i32 = 1;
const DOWNLOAD: i32 = 2;
const UPLOAD: i32 = 4;
const ADMIN: i32 = 8;
const UPLOADER: i32 = VIEW | DOWNLOAD | UPLOAD;
const FULL_ADMIN: i32 = VIEW | DOWNLOAD | UPLOAD | ADMIN;

#[sqlx::test]
async fn new_song_playlist_ids_must_belong_to_caller_unless_admin(pool: PgPool) {
    let (router, state) = app(pool.clone());
    let owner = insert_user(&pool, "owner@test.koiro", UPLOADER).await;
    let other = insert_user(&pool, "other@test.koiro", UPLOADER).await;
    let admin = insert_user(&pool, "admin@test.koiro", FULL_ADMIN).await;

    let others_playlist = create_playlist(&router, &state, other, "other 的歌单").await;
    let others_playlist_id = others_playlist["id"].as_str().unwrap().to_owned();

    let (status, body) = create_song(
        &router,
        &state,
        owner,
        "owner 的新歌",
        std::slice::from_ref(&others_playlist_id),
    )
    .await;
    assert_eq!(
        status,
        StatusCode::BAD_REQUEST,
        "不能把新歌放进不属于自己的歌单: {body}"
    );

    // admin 可以放进任何人的歌单
    let (status, body) = create_song(
        &router,
        &state,
        admin,
        "admin 代建的歌",
        std::slice::from_ref(&others_playlist_id),
    )
    .await;
    assert_eq!(status, StatusCode::CREATED, "ADMIN 不受歌单归属限制: {body}");
    let playlists: Vec<&str> = body["playlists"]
        .as_array()
        .unwrap()
        .iter()
        .map(|p| p["name"].as_str().unwrap())
        .collect();
    assert_eq!(playlists, ["other 的歌单"]);
}

#[sqlx::test]
async fn replacing_a_song_does_not_change_its_playlists(pool: PgPool) {
    let (router, state) = app(pool.clone());
    let owner = insert_user(&pool, "owner@test.koiro", UPLOADER).await;

    let playlist = create_playlist(&router, &state, owner, "owner 的歌单").await;
    let playlist_id = playlist["id"].as_str().unwrap().to_owned();
    let (status, song) = create_song(&router, &state, owner, "原标题", &[playlist_id]).await;
    assert_eq!(status, StatusCode::CREATED);
    let song_id = song["id"].as_str().unwrap().to_owned();
    assert_eq!(song["playlists"].as_array().unwrap().len(), 1);

    // PUT 的 SongInput 不含 playlistIds 字段，只改标题
    let (status, body) = send(
        &router,
        "PUT",
        &format!("/songs/{song_id}"),
        Some((&state, owner)),
        Some(json!({
            "title": "改过的标题",
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
        })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["title"], "改过的标题");
    assert_eq!(
        body["playlists"].as_array().unwrap().len(),
        1,
        "PUT /songs/{{id}} 不应该影响所属歌单"
    );
}

#[sqlx::test]
async fn only_owner_or_admin_can_replace_or_delete_song(pool: PgPool) {
    let (router, state) = app(pool.clone());
    let owner = insert_user(&pool, "owner@test.koiro", UPLOADER).await;
    let other = insert_user(&pool, "other@test.koiro", UPLOADER).await;
    let admin = insert_user(&pool, "admin@test.koiro", FULL_ADMIN).await;

    let (status, song) = create_song(&router, &state, owner, "owner 的歌", &[]).await;
    assert_eq!(status, StatusCode::CREATED);
    let song_id = song["id"].as_str().unwrap().to_owned();

    let replace_body = json!({
        "title": "换个标题",
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
    });

    let (status, _) = send(
        &router,
        "PUT",
        &format!("/songs/{song_id}"),
        Some((&state, other)),
        Some(replace_body.clone()),
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);

    let (status, _) = send(
        &router,
        "PUT",
        &format!("/songs/{song_id}"),
        Some((&state, admin)),
        Some(replace_body),
    )
    .await;
    assert_eq!(status, StatusCode::OK);

    let (status, _) = send(
        &router,
        "DELETE",
        &format!("/songs/{song_id}"),
        Some((&state, other)),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);

    let (status, _) = send(
        &router,
        "DELETE",
        &format!("/songs/{song_id}"),
        Some((&state, owner)),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::NO_CONTENT);
}
