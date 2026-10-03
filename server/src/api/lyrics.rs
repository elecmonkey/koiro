use serde::{Deserialize, Serialize};

use super::{Language, LyricsId};

/// 一份歌词
#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(rename_all = "camelCase")]
pub struct Lyrics {
    pub id: LyricsId,
    /// 在这首歌内唯一，如「原文」「中文翻译」
    pub name: String,
    pub is_default: bool,
    pub languages: Vec<Language>,
    pub lines: Vec<LyricLine>,
}

/// 一行歌词：一个时间点上显示的一句
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(rename_all = "camelCase")]
pub struct LyricLine {
    /// 开始时间（毫秒）
    pub start_ms: u32,
    /// 结束时间（毫秒），不早于开始时间
    pub end_ms: Option<u32>,
    /// 这一行的内容；为空表示空行（如间奏）
    pub spans: Vec<Span>,
}

/// 行内的一段文字
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum Span {
    /// 普通文字
    Text { text: String },
    /// 带注音的文字：`base` 上方标注 `ruby`
    Ruby { base: String, ruby: String },
}
