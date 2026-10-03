//! HTTP 层：每个 handler 只负责提取参数、声明权限、读写数据库，并以 [`crate::api`] 的类型响应

mod audio;
mod auth;
mod cli_auth;
mod extract;
mod languages;
mod playlists;
mod search;
mod songs;
mod staff;
mod uploads;
mod users;

use axum::{Router, http::StatusCode, routing::get};

use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/health", get(health))
        .merge(auth::router())
        .merge(cli_auth::router())
        .merge(audio::router())
        .merge(uploads::router())
        .merge(songs::router())
        .merge(playlists::router())
        .merge(staff::router())
        .merge(languages::router())
        .merge(search::router())
        .merge(users::router())
}

async fn health() -> StatusCode {
    StatusCode::NO_CONTENT
}
