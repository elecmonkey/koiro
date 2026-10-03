mod audio;
mod auth;
mod browse;
mod cli_auth;
mod common;
mod playlists;
mod songs;
mod uploads;
mod users;

use axum::{Json, Router, routing::get};
use serde_json::{Value, json};

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
        .merge(users::router())
        .merge(browse::router())
}

async fn health() -> Json<Value> {
    Json(json!({ "ok": true }))
}
