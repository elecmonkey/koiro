//! 图片入库与对象 URL 的组装

use crate::{
    api::UploadedImage,
    error::{AppError, AppResult},
    images,
    state::AppState,
    storage::IMAGE_CACHE_CONTROL,
};

/// 图片的公开地址
pub fn image_url(state: &AppState, key: &str) -> String {
    state.storage.public_url(key)
}

/// 对象 ID 是否是本站上传的图片 / 音频，避免引用桶里的任意 key
pub fn is_image_key(state: &AppState, key: &str) -> bool {
    key.starts_with(&format!("{}img/", state.storage.prefix()))
}

pub fn is_audio_key(state: &AppState, key: &str) -> bool {
    key.starts_with(&format!("{}music/", state.storage.prefix()))
}

/// 校验图片格式后原样写入 `img/`
pub async fn store_image(state: &AppState, bytes: Vec<u8>) -> AppResult<UploadedImage> {
    if bytes.len() > images::MAX_IMAGE_BYTES {
        return Err(AppError::BadRequest("图片过大".into()));
    }
    let detected = images::detect(&bytes).ok_or_else(|| AppError::BadRequest("不支持的图片格式".into()))?;
    let key = state.storage.new_key("img", detected.ext);
    state
        .storage
        .put(&key, bytes, detected.content_type, IMAGE_CACHE_CONTROL)
        .await?;
    Ok(UploadedImage {
        url: image_url(state, &key),
        object_id: key,
    })
}
