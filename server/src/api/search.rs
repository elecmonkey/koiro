use serde::{Deserialize, Serialize};

use super::SongSummary;

/// 搜索条件（查询字符串）
#[derive(Debug, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
pub struct SearchQuery {
    /// 在标题、staff 姓名、歌词中查找的文字（不区分大小写）
    pub q: String,
}

/// 一条搜索结果，按相关度排列
#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(rename_all = "camelCase")]
pub struct SearchHit {
    pub song: SongSummary,
    /// 命中的部分
    pub matched: Vec<MatchField>,
    /// 标题，标出命中的文字
    pub title: Vec<TextSegment>,
    /// staff，每个姓名标出命中的文字
    pub staff: Vec<StaffHighlight>,
    /// 命中歌词时，包含关键字的一段歌词
    pub lyrics_excerpt: Option<Vec<TextSegment>>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(rename_all = "lowercase")]
pub enum MatchField {
    Title,
    Staff,
    Lyrics,
}

/// 文字片段；`highlight` 为命中关键字的部分
#[derive(Debug, PartialEq, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
pub struct TextSegment {
    pub text: String,
    pub highlight: bool,
}

#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
pub struct StaffHighlight {
    pub role: String,
    pub names: Vec<Vec<TextSegment>>,
}
