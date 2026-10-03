use serde::{Deserialize, Serialize};

/// 歌词的语种
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export))]
#[serde(rename_all = "lowercase")]
pub enum Language {
    /// 普通话
    Zh,
    /// English
    En,
    /// 日本語
    Ja,
    /// 한국어
    Ko,
    /// 粵語
    Yue,
    /// 閩南語
    Nan,
}

impl Language {
    pub const ALL: [Self; 6] = [Self::Zh, Self::En, Self::Ja, Self::Ko, Self::Yue, Self::Nan];

    pub fn code(self) -> &'static str {
        match self {
            Self::Zh => "zh",
            Self::En => "en",
            Self::Ja => "ja",
            Self::Ko => "ko",
            Self::Yue => "yue",
            Self::Nan => "nan",
        }
    }

    pub fn from_code(code: &str) -> Option<Self> {
        Self::ALL.into_iter().find(|language| language.code() == code)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn codes_match_serialization() {
        for language in Language::ALL {
            assert_eq!(serde_json::to_value(language).unwrap(), language.code());
            assert_eq!(Language::from_code(language.code()), Some(language));
        }
        assert_eq!(Language::from_code("jp"), None);
    }
}
