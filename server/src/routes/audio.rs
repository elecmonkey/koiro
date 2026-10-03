use axum::{
    Router,
    extract::{Path, State},
    response::Redirect,
    routing::get,
};
use uuid::Uuid;

use crate::{
    auth::{Auth, CanView, Download},
    error::{AppError, AppResult},
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/audio/{id}", get(play))
        .route("/audio/{id}/download", get(download))
}

/// 302 到按天对齐的签名 URL，前端直接 `<audio src="/api/audio/<id>">`
async fn play(State(state): State<AppState>, _view: CanView, Path(id): Path<Uuid>) -> AppResult<Redirect> {
    let version = sqlx::query!("SELECT object_id FROM audio_versions WHERE id = $1", id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(AppError::NotFound)?;
    let url = state.storage.presign_get_daily(&version.object_id, None).await?;
    Ok(Redirect::to(&url))
}

/// 以附件形式下载，文件名为「歌名 - 版本名.扩展名」
async fn download(
    State(state): State<AppState>,
    _auth: Auth<Download>,
    Path(id): Path<Uuid>,
) -> AppResult<Redirect> {
    let row = sqlx::query!(
        r#"SELECT av.object_id, av.name, s.title
           FROM audio_versions av JOIN songs s ON s.id = av.song_id
           WHERE av.id = $1"#,
        id
    )
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;
    let ext = row.object_id.rsplit_once('.').map_or("mp3", |(_, ext)| ext);
    let filename = format!("{} - {}.{ext}", row.title, row.name);
    let url = state
        .storage
        .presign_get_daily(&row.object_id, Some(&filename))
        .await?;
    Ok(Redirect::to(&url))
}
