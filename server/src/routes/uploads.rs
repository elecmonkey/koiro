use axum::{
    Router,
    body::Bytes,
    extract::{DefaultBodyLimit, State},
    http::StatusCode,
    routing::post,
};

use super::extract::Json;
use crate::{
    api::{AudioUpload, AudioUploadRequest, ImageUrl, UploadedImage},
    auth::{Auth, Upload},
    error::{AppError, AppResult},
    images::MAX_IMAGE_BYTES,
    media::store_image,
    remote,
    state::AppState,
    storage::AUDIO_CACHE_CONTROL,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route(
            "/uploads/images",
            post(upload_image).layer(DefaultBodyLimit::max(MAX_IMAGE_BYTES)),
        )
        .route("/uploads/images/from-url", post(image_from_url))
        .route("/uploads/audio", post(presign_audio))
}

/// 请求体即图片原始字节
async fn upload_image(
    State(state): State<AppState>,
    _auth: Auth<Upload>,
    body: Bytes,
) -> AppResult<(StatusCode, Json<UploadedImage>)> {
    Ok((
        StatusCode::CREATED,
        Json(store_image(&state, body.to_vec()).await?),
    ))
}

async fn image_from_url(
    State(state): State<AppState>,
    _auth: Auth<Upload>,
    Json(body): Json<ImageUrl>,
) -> AppResult<(StatusCode, Json<UploadedImage>)> {
    let (bytes, _) = remote::fetch(&state.http, body.url.trim(), MAX_IMAGE_BYTES)
        .await
        .map_err(|err| AppError::BadRequest(format!("下载图片失败：{err}")))?;
    Ok((StatusCode::CREATED, Json(store_image(&state, bytes).await?)))
}

/// 音频文件较大，由客户端直传对象存储
async fn presign_audio(
    State(state): State<AppState>,
    _auth: Auth<Upload>,
    Json(body): Json<AudioUploadRequest>,
) -> AppResult<Json<AudioUpload>> {
    if !body.content_type.starts_with("audio/") {
        return Err(AppError::BadRequest("只支持音频文件".into()));
    }
    let ext = file_ext(&body.filename).unwrap_or("bin");
    let key = state.storage.new_key("music", ext);
    let presigned = state
        .storage
        .presign_put(key, &body.content_type, AUDIO_CACHE_CONTROL)
        .await?;
    Ok(Json(AudioUpload {
        url: presigned.url,
        headers: presigned
            .headers
            .into_iter()
            .map(|(name, value)| (name.to_owned(), value))
            .collect(),
        object_id: presigned.key,
    }))
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
