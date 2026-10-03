use axum::{
    Json, Router,
    body::Bytes,
    extract::{DefaultBodyLimit, State},
    routing::post,
};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

use crate::{
    auth::{Auth, Upload},
    error::{AppError, AppResult},
    images::MAX_IMAGE_BYTES,
    media::{StoredImage, store_image},
    remote,
    state::AppState,
    storage::AUDIO_CACHE_CONTROL,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/uploads/audio", post(presign_audio))
        .route(
            "/uploads/image",
            post(upload_image).layer(DefaultBodyLimit::max(MAX_IMAGE_BYTES)),
        )
        .route("/uploads/image-from-url", post(image_from_url))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PresignAudioBody {
    filename: String,
    content_type: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PresignAudioResponse {
    url: String,
    object_id: String,
    /// 上传时必须原样携带的请求头
    headers: BTreeMap<&'static str, String>,
}

/// 音频文件较大，由浏览器直传 S3
async fn presign_audio(
    State(state): State<AppState>,
    _auth: Auth<Upload>,
    Json(body): Json<PresignAudioBody>,
) -> AppResult<Json<PresignAudioResponse>> {
    if !body.content_type.starts_with("audio/") {
        return Err(AppError::BadRequest("只支持音频文件".into()));
    }
    let ext = file_ext(&body.filename).unwrap_or("bin");
    let key = state.storage.new_key("music", ext);
    let presigned = state
        .storage
        .presign_put(key, &body.content_type, AUDIO_CACHE_CONTROL)
        .await?;
    Ok(Json(PresignAudioResponse {
        url: presigned.url,
        object_id: presigned.key,
        headers: presigned.headers.into_iter().collect(),
    }))
}

/// 请求体即图片原始字节
async fn upload_image(
    State(state): State<AppState>,
    _auth: Auth<Upload>,
    body: Bytes,
) -> AppResult<Json<StoredImage>> {
    Ok(Json(store_image(&state, body.to_vec()).await?))
}

#[derive(Deserialize)]
struct ImageFromUrlBody {
    url: String,
}

async fn image_from_url(
    State(state): State<AppState>,
    _auth: Auth<Upload>,
    Json(body): Json<ImageFromUrlBody>,
) -> AppResult<Json<StoredImage>> {
    let (bytes, _) = remote::fetch(&state.http, body.url.trim(), MAX_IMAGE_BYTES)
        .await
        .map_err(|err| AppError::BadRequest(format!("拉取失败：{err}")))?;
    Ok(Json(store_image(&state, bytes).await?))
}

/// 取文件扩展名（仅保留 1–8 位字母数字）
fn file_ext(filename: &str) -> Option<&str> {
    let (_, ext) = filename.rsplit_once('.')?;
    (!ext.is_empty() && ext.len() <= 8 && ext.chars().all(|c| c.is_ascii_alphanumeric())).then_some(ext)
}

#[cfg(test)]
mod tests {
    use super::file_ext;

    #[test]
    fn extensions() {
        assert_eq!(file_ext("a.mp3"), Some("mp3"));
        assert_eq!(file_ext("歌.FLAC"), Some("FLAC"));
        assert_eq!(file_ext("noext"), None);
        assert_eq!(file_ext("x.mp3?evil=1"), None);
    }
}
