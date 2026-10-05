use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use super::{AudioVersionId, Language, LyricLine, Lyrics, LyricsId, OwnerRef, PlaylistId, SongId};

/// 一个角色及担任它的人，如 `{ role: "作曲", names: ["甲", "乙"] }`
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
pub struct StaffCredit {
    pub role: String,
    pub names: Vec<String>,
}

/// 列表中的歌曲
#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(rename_all = "camelCase")]
pub struct SongSummary {
    pub id: SongId,
    pub title: String,
    pub description: String,
    pub staff: Vec<StaffCredit>,
    pub cover_url: String,
    /// 列表里直接播放的版本
    pub default_version: AudioVersion,
    pub version_count: i64,
    pub lyrics_count: i64,
    pub updated_at: DateTime<Utc>,
}

/// 歌曲的完整信息
#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(rename_all = "camelCase")]
pub struct SongDetail {
    pub id: SongId,
    pub title: String,
    pub description: String,
    pub staff: Vec<StaffCredit>,
    pub cover_url: String,
    /// 按展示顺序，恰好一个是默认版本
    pub versions: Vec<AudioVersion>,
    /// 按展示顺序；有歌词时恰好一份是默认歌词
    pub lyrics: Vec<Lyrics>,
    /// 所属歌单，按名称排序
    pub playlists: Vec<PlaylistRef>,
    /// 创建者；没有创建者信息时为空（历史数据，或创建者账号已删除）
    pub owner: Option<OwnerRef>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 一个音频版本，如「主版本」「伴奏」；音频本身经 `/audio/{id}` 播放
#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(rename_all = "camelCase")]
pub struct AudioVersion {
    pub id: AudioVersionId,
    /// 在这首歌内唯一
    pub name: String,
    pub is_default: bool,
    /// 播放这个版本时显示的歌词
    pub lyrics_id: Option<LyricsId>,
}

#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
pub struct PlaylistRef {
    pub id: PlaylistId,
    pub name: String,
}

/// 新建或整体替换一首歌的内容；`GET /songs/{id}/input` 返回现有歌曲的这一形式。
///
/// 替换时音频版本按 `name`、歌词按 `name` 与现有的对应：名称不变的保留原 ID，
/// 不在其中的被删除。
#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(rename_all = "camelCase")]
pub struct SongInput {
    pub title: String,
    pub description: String,
    /// 上传图片得到的对象 ID
    pub cover_object_id: String,
    pub staff: Vec<StaffCredit>,
    /// 至少一个，恰好一个 `isDefault`
    pub versions: Vec<AudioVersionInput>,
    /// 可以为空；不为空时恰好一份 `isDefault`
    pub lyrics: Vec<LyricsInput>,
    pub playlist_ids: Vec<PlaylistId>,
}

#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(rename_all = "camelCase")]
pub struct AudioVersionInput {
    pub name: String,
    /// 上传音频得到的对象 ID
    pub object_id: String,
    pub is_default: bool,
    /// 绑定的歌词，填同一份输入里 `lyrics[].name`
    pub lyrics_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(rename_all = "camelCase")]
pub struct LyricsInput {
    pub name: String,
    pub is_default: bool,
    pub languages: Vec<Language>,
    /// 按开始时间排列
    pub lines: Vec<LyricLine>,
}

/// 选择歌曲用的精简条目
#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
pub struct SongOption {
    pub id: SongId,
    pub title: String,
}

/// 歌曲列表的筛选条件（查询字符串），可组合
#[derive(Debug, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
pub struct SongFilter {
    /// 某人参与的歌曲（姓名精确匹配）
    #[cfg_attr(test, ts(optional))]
    pub staff: Option<String>,
    /// 有该语种歌词的歌曲
    #[cfg_attr(test, ts(optional))]
    pub language: Option<Language>,
    /// 歌单中的歌曲，此时按歌单顺序排列；否则按更新时间从新到旧
    #[cfg_attr(test, ts(optional))]
    pub playlist: Option<PlaylistId>,
    /// 标题包含的文字
    #[cfg_attr(test, ts(optional))]
    pub q: Option<String>,
}
