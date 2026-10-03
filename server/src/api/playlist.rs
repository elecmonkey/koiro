use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use super::{PlaylistId, SongId};

#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(rename_all = "camelCase")]
pub struct Playlist {
    pub id: PlaylistId,
    pub name: String,
    pub description: String,
    pub cover_url: String,
    pub song_count: i64,
    pub updated_at: DateTime<Utc>,
}

/// 新建歌单
#[derive(Debug, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(rename_all = "camelCase")]
pub struct PlaylistInput {
    pub name: String,
    pub description: String,
    /// 上传图片得到的对象 ID
    pub cover_object_id: String,
}

/// 修改歌单；省略的字段不变
#[derive(Debug, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(rename_all = "camelCase")]
pub struct PlaylistPatch {
    #[serde(default)]
    #[cfg_attr(test, ts(optional))]
    pub name: Option<String>,
    #[serde(default)]
    #[cfg_attr(test, ts(optional))]
    pub description: Option<String>,
    #[serde(default)]
    #[cfg_attr(test, ts(optional))]
    pub cover_object_id: Option<String>,
}

/// 歌单列表的筛选条件（查询字符串）
#[derive(Debug, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
pub struct PlaylistFilter {
    /// 名称或简介包含的文字
    #[cfg_attr(test, ts(optional))]
    pub q: Option<String>,
}

/// 一组歌曲：追加时为要加入的歌曲；重排时为歌单里全部歌曲的新顺序
#[derive(Debug, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(rename_all = "camelCase")]
pub struct PlaylistSongs {
    pub song_ids: Vec<SongId>,
}

/// 追加的结果：已在歌单里、不存在或重复给出的歌曲计入 `skipped`
#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
pub struct AddedSongs {
    pub added: i64,
    pub skipped: i64,
}

/// 选择歌单用的精简条目
#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
pub struct PlaylistOption {
    pub id: PlaylistId,
    pub name: String,
}
