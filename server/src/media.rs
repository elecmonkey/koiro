//! 图片入库与对象 URL 的组装

use serde::Serialize;

use crate::{
    error::{AppError, AppResult},
    images,
    state::AppState,
    storage::IMAGE_CACHE_CONTROL,
};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredImage {
    pub object_id: String,
    pub url: String,
}

/// 封面图片的公开地址
#[derive(Debug, Clone, Serialize)]
pub struct Cover {
    pub url: String,
}

pub fn cover(state: &AppState, key: Option<&str>) -> Option<Cover> {
    key.map(|key| Cover {
        url: state.storage.public_url(key),
    })
}

/// 校验图片格式后原样写入 `img/`
pub async fn store_image(state: &AppState, bytes: Vec<u8>) -> AppResult<StoredImage> {
    if bytes.len() > images::MAX_IMAGE_BYTES {
        return Err(AppError::BadRequest("图片过大".into()));
    }
    let detected = images::detect(&bytes).ok_or_else(|| AppError::BadRequest("不支持的图片格式".into()))?;
    let key = state.storage.new_key("img", detected.ext);
    state
        .storage
        .put(&key, bytes, detected.content_type, IMAGE_CACHE_CONTROL)
        .await?;
    Ok(StoredImage {
        url: state.storage.public_url(&key),
        object_id: key,
    })
}
