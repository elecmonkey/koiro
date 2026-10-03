use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

/// 已保存的图片
#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(rename_all = "camelCase")]
pub struct UploadedImage {
    /// 填入封面字段的对象 ID
    pub object_id: String,
    pub url: String,
}

/// 由服务器下载一张网络图片
#[derive(Debug, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
pub struct ImageUrl {
    pub url: String,
}

/// 申请上传一个音频文件
#[derive(Debug, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(rename_all = "camelCase")]
pub struct AudioUploadRequest {
    /// 原文件名，用来保留扩展名
    pub filename: String,
    /// `audio/*`
    pub content_type: String,
}

/// 音频直传对象存储的凭据：向 `url` 发送 PUT，并原样带上 `headers`
#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(rename_all = "camelCase")]
pub struct AudioUpload {
    pub url: String,
    pub headers: BTreeMap<String, String>,
    /// 上传完成后填入音频版本的对象 ID
    pub object_id: String,
}
