//! S3 兼容对象存储。
//!
//! 约定：
//! - 对象 key 只由后端生成（`<prefix><folder>/<uuid>.<ext>`），从不覆盖已有 key，
//!   因此同一 URL 的内容永不变化，可以长缓存。
//! - `img/` 前缀公开读，前端直接用 [`Storage::public_url`]；
//!   `music/` 私有，用按天对齐的签名 URL，同一天内 URL 不变以命中浏览器缓存。

use std::time::{Duration, SystemTime};

use anyhow::Context;
use aws_credential_types::Credentials;
use aws_sdk_s3::{
    Client,
    config::{BehaviorVersion, Region, RequestChecksumCalculation, ResponseChecksumValidation},
    presigning::PresigningConfig,
    primitives::ByteStream,
    types::MetadataDirective,
};
use chrono::{Duration as ChronoDuration, Utc};
use uuid::Uuid;

use crate::config::S3Config;

/// 公开图片：key 不可变，缓存一年
pub const IMAGE_CACHE_CONTROL: &str = "public, max-age=31536000, immutable";
/// 私有音频：签名 URL 一天内不变
pub const AUDIO_CACHE_CONTROL: &str = "private, max-age=86400";

#[derive(Clone)]
pub struct Storage {
    client: Client,
    bucket: String,
    prefix: String,
    public_url: String,
}

pub struct PresignedUpload {
    pub url: String,
    pub key: String,
    /// 浏览器 PUT 时必须原样带上的请求头（已参与签名）
    pub headers: Vec<(&'static str, String)>,
}

impl Storage {
    pub fn new(config: &S3Config) -> Self {
        let s3_config = aws_sdk_s3::Config::builder()
            .behavior_version(BehaviorVersion::latest())
            .region(Region::new(config.region.clone()))
            .endpoint_url(&config.endpoint)
            .credentials_provider(Credentials::new(
                &config.access_key_id,
                &config.secret_access_key,
                None,
                None,
                "koiro",
            ))
            .force_path_style(config.force_path_style)
            // 部分 S3 兼容服务不支持新版 SDK 默认附加的 CRC 校验头
            .request_checksum_calculation(RequestChecksumCalculation::WhenRequired)
            .response_checksum_validation(ResponseChecksumValidation::WhenRequired)
            .build();
        Self {
            client: Client::from_conf(s3_config),
            bucket: config.bucket.clone(),
            prefix: normalize_prefix(&config.prefix),
            public_url: config.public_url.trim_end_matches('/').to_owned(),
        }
    }

    pub fn prefix(&self) -> &str {
        &self.prefix
    }

    /// 生成新的对象 key：`<prefix><folder>/<uuid>.<ext>`
    pub fn new_key(&self, folder: &str, ext: &str) -> String {
        format!("{}{folder}/{}.{ext}", self.prefix, Uuid::new_v4())
    }

    pub fn public_url(&self, key: &str) -> String {
        format!("{}/{key}", self.public_url)
    }

    pub async fn put(
        &self,
        key: &str,
        body: Vec<u8>,
        content_type: &str,
        cache_control: &str,
    ) -> anyhow::Result<()> {
        self.client
            .put_object()
            .bucket(&self.bucket)
            .key(key)
            .body(ByteStream::from(body))
            .content_type(content_type)
            .cache_control(cache_control)
            .send()
            .await
            .with_context(|| format!("put {key}"))?;
        Ok(())
    }

    pub async fn get(&self, key: &str) -> anyhow::Result<Vec<u8>> {
        let output = self
            .client
            .get_object()
            .bucket(&self.bucket)
            .key(key)
            .send()
            .await
            .with_context(|| format!("get {key}"))?;
        Ok(output.body.collect().await?.into_bytes().to_vec())
    }

    pub async fn delete(&self, key: &str) -> anyhow::Result<()> {
        self.client
            .delete_object()
            .bucket(&self.bucket)
            .key(key)
            .send()
            .await
            .with_context(|| format!("delete {key}"))?;
        Ok(())
    }

    pub async fn exists(&self, key: &str) -> anyhow::Result<bool> {
        match self
            .client
            .head_object()
            .bucket(&self.bucket)
            .key(key)
            .send()
            .await
        {
            Ok(_) => Ok(true),
            Err(err) if err.as_service_error().is_some_and(|e| e.is_not_found()) => Ok(false),
            Err(err) => Err(anyhow::Error::new(err).context(format!("head {key}"))),
        }
    }

    /// 列出前缀下的所有 key
    pub async fn list(&self, prefix: &str) -> anyhow::Result<Vec<String>> {
        let mut keys = Vec::new();
        let mut pages = self
            .client
            .list_objects_v2()
            .bucket(&self.bucket)
            .prefix(prefix)
            .into_paginator()
            .send();
        while let Some(page) = pages.next().await {
            let page = page.with_context(|| format!("list {prefix}"))?;
            keys.extend(page.contents().iter().filter_map(|o| o.key().map(str::to_owned)));
        }
        Ok(keys)
    }

    /// 原地复制以替换元数据（只改 Cache-Control，不重新上传内容）
    pub async fn set_cache_control(
        &self,
        key: &str,
        content_type: Option<&str>,
        cache_control: &str,
    ) -> anyhow::Result<()> {
        let mut request = self
            .client
            .copy_object()
            .bucket(&self.bucket)
            .key(key)
            .copy_source(format!("{}/{key}", self.bucket))
            .metadata_directive(MetadataDirective::Replace)
            .cache_control(cache_control);
        if let Some(content_type) = content_type {
            request = request.content_type(content_type);
        }
        request.send().await.with_context(|| format!("copy {key}"))?;
        Ok(())
    }

    /// 返回 (Content-Type, Cache-Control)
    pub async fn head(&self, key: &str) -> anyhow::Result<(Option<String>, Option<String>)> {
        let output = self
            .client
            .head_object()
            .bucket(&self.bucket)
            .key(key)
            .send()
            .await
            .with_context(|| format!("head {key}"))?;
        Ok((
            output.content_type().map(str::to_owned),
            output.cache_control().map(str::to_owned),
        ))
    }

    /// 浏览器直传用的预签名 PUT。Content-Type 与 Cache-Control 参与签名，上传时必须原样携带。
    pub async fn presign_put(
        &self,
        key: String,
        content_type: &str,
        cache_control: &str,
    ) -> anyhow::Result<PresignedUpload> {
        let presigned = self
            .client
            .put_object()
            .bucket(&self.bucket)
            .key(&key)
            .content_type(content_type)
            .cache_control(cache_control)
            .presigned(PresigningConfig::expires_in(Duration::from_secs(600))?)
            .await
            .context("presign put")?;
        Ok(PresignedUpload {
            url: presigned.uri().to_owned(),
            key,
            headers: vec![
                ("Content-Type", content_type.to_owned()),
                ("Cache-Control", cache_control.to_owned()),
            ],
        })
    }

    /// 按 UTC 自然日对齐的签名 GET：同一天内对同一对象生成的 URL 完全相同。
    /// `download_filename` 非空时以附件形式下载。
    pub async fn presign_get_daily(
        &self,
        key: &str,
        download_filename: Option<&str>,
    ) -> anyhow::Result<String> {
        let day_start = Utc::now()
            .date_naive()
            .and_hms_opt(0, 0, 0)
            .expect("midnight")
            .and_utc();
        let config = PresigningConfig::builder()
            .start_time(SystemTime::from(day_start))
            // 覆盖当天剩余时间并留足余量
            .expires_in(ChronoDuration::days(2).to_std()?)
            .build()?;
        let mut request = self
            .client
            .get_object()
            .bucket(&self.bucket)
            .key(key)
            .response_cache_control(AUDIO_CACHE_CONTROL);
        if let Some(filename) = download_filename {
            request = request.response_content_disposition(content_disposition_attachment(filename));
        }
        let presigned = request.presigned(config).await.context("presign get")?;
        Ok(presigned.uri().to_owned())
    }
}

fn normalize_prefix(prefix: &str) -> String {
    let trimmed = prefix.trim_matches('/');
    if trimmed.is_empty() {
        String::new()
    } else {
        format!("{trimmed}/")
    }
}

/// RFC 6266：同时提供 ASCII 回退名和 UTF-8 文件名
fn content_disposition_attachment(filename: &str) -> String {
    let ascii: String = filename
        .chars()
        .map(|c| {
            if c.is_ascii_graphic() && c != '"' && c != '\\' || c == ' ' {
                c
            } else {
                '_'
            }
        })
        .collect();
    let encoded: String = filename
        .bytes()
        .map(|b| match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'.' | b'_' | b'~' => (b as char).to_string(),
            _ => format!("%{b:02X}"),
        })
        .collect();
    format!("attachment; filename=\"{ascii}\"; filename*=UTF-8''{encoded}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn prefixes() {
        assert_eq!(normalize_prefix("koiro/"), "koiro/");
        assert_eq!(normalize_prefix("/koiro"), "koiro/");
        assert_eq!(normalize_prefix(""), "");
    }

    #[test]
    fn disposition() {
        assert_eq!(
            content_disposition_attachment("辟浪 - 主版本.mp3"),
            "attachment; filename=\"__ - ___.mp3\"; filename*=UTF-8''%E8%BE%9F%E6%B5%AA%20-%20%E4%B8%BB%E7%89%88%E6%9C%AC.mp3"
        );
    }
}
