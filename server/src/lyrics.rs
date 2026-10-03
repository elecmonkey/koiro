//! 歌词行的校验，以及派生搜索用的纯文本

use crate::api::{LyricLine, Span};

/// 检查歌词行；返回的错误说明会直接展示给用户
pub fn validate(lines: &[LyricLine]) -> Result<(), String> {
    let mut previous_start = 0;
    for (index, line) in lines.iter().enumerate() {
        let number = index + 1;
        if line.start_ms < previous_start {
            return Err(format!("第 {number} 行的开始时间早于上一行"));
        }
        previous_start = line.start_ms;
        if line.end_ms.is_some_and(|end| end < line.start_ms) {
            return Err(format!("第 {number} 行的结束时间早于开始时间"));
        }
        for span in &line.spans {
            let texts: &[&str] = match span {
                Span::Text { text } => &[text],
                Span::Ruby { base, ruby } => &[base, ruby],
            };
            if texts.iter().any(|text| text.is_empty()) {
                return Err(format!("第 {number} 行有空的文字片段"));
            }
            // 一行歌词就是一个带时间的行，行内不能再换行
            if texts.iter().any(|text| text.contains(['\n', '\r'])) {
                return Err(format!("第 {number} 行不能包含换行"));
            }
        }
    }
    Ok(())
}

/// 搜索用的纯文本：注音取基字，行内空白折叠为单个空格，跳过空行
pub fn plain_text(lines: &[LyricLine]) -> String {
    lines
        .iter()
        .map(|line| {
            let joined: String = line
                .spans
                .iter()
                .map(|span| match span {
                    Span::Text { text } => text.as_str(),
                    Span::Ruby { base, .. } => base.as_str(),
                })
                .collect();
            joined.split_whitespace().collect::<Vec<_>>().join(" ")
        })
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn text(text: &str) -> Span {
        Span::Text { text: text.into() }
    }

    fn ruby(base: &str, ruby: &str) -> Span {
        Span::Ruby {
            base: base.into(),
            ruby: ruby.into(),
        }
    }

    fn line(start_ms: u32, spans: Vec<Span>) -> LyricLine {
        LyricLine {
            start_ms,
            end_ms: None,
            spans,
        }
    }

    #[test]
    fn plain_text_uses_ruby_base_and_skips_empty_lines() {
        let lines = [
            line(10_500, vec![ruby("君", "きみ"), text("の声が")]),
            line(16_800, vec![]),
            line(20_000, vec![text("  世界を  変える ")]),
        ];
        assert_eq!(plain_text(&lines), "君の声が\n世界を 変える");
    }

    #[test]
    fn accepts_sorted_lines_and_equal_start_times() {
        let lines = [
            line(0, vec![text("a")]),
            line(0, vec![text("b")]),
            line(5, vec![]),
        ];
        assert!(validate(&lines).is_ok());
    }

    #[test]
    fn rejects_bad_lines() {
        assert!(validate(&[line(10, vec![]), line(5, vec![])]).is_err());
        let mut ends_early = line(100, vec![]);
        ends_early.end_ms = Some(50);
        assert!(validate(&[ends_early]).is_err());
        assert!(validate(&[line(0, vec![text("")])]).is_err());
        assert!(validate(&[line(0, vec![ruby("君", "")])]).is_err());
        assert!(validate(&[line(0, vec![text("a\nb")])]).is_err());
        assert!(validate(&[line(0, vec![ruby("君", "き\rみ")])]).is_err());
    }
}
