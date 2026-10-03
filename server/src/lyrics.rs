//! KOIRO_AST_V1 歌词文档：由编辑器提交的「行」构建 AST，并派生搜索用纯文本

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

use crate::api::Language;

pub const FORMAT: &str = "KOIRO_AST_V1";

/// 编辑器中的一行：`text` 用 `/` 分词，`ruby_by_index` 按分词序号标注读音
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LineInput {
    pub start_ms: i64,
    pub end_ms: Option<i64>,
    #[serde(default)]
    pub text: String,
    #[serde(default)]
    pub ruby_by_index: BTreeMap<String, String>,
}

#[derive(Debug, Serialize)]
#[serde(tag = "type", rename_all = "lowercase")]
enum Inline {
    Text { text: String },
    Ruby { base: String, ruby: String },
}

pub struct BuiltDocument {
    pub content: Value,
    pub plain_text: String,
}

pub fn build(lines: &[LineInput], languages: &[Language]) -> Result<BuiltDocument, String> {
    let mut blocks = Vec::with_capacity(lines.len());
    let mut plain_lines = Vec::new();

    for (index, line) in lines.iter().enumerate() {
        if line.start_ms < 0 {
            return Err(format!("第 {} 行开始时间不能为负数", index + 1));
        }
        if line.end_ms.is_some_and(|end| end < line.start_ms) {
            return Err(format!("第 {} 行结束时间不能早于开始时间", index + 1));
        }
        // 一行歌词就是一个带时间的行，行内不能再换行
        let has_newline = |s: &str| s.contains(['\n', '\r']);
        if has_newline(&line.text) || line.ruby_by_index.values().any(|ruby| has_newline(ruby)) {
            return Err(format!("第 {} 行不能包含换行", index + 1));
        }
        let children = inlines(&line.text, &line.ruby_by_index);
        let plain = plain_text_of(&children);
        if !plain.is_empty() {
            plain_lines.push(plain);
        }

        let mut time = json!({ "startMs": line.start_ms });
        if let Some(end) = line.end_ms {
            time["endMs"] = json!(end);
        }
        blocks.push(json!({ "type": "line", "time": time, "children": children }));
    }

    Ok(BuiltDocument {
        content: json!({ "type": "doc", "meta": { "languages": languages }, "blocks": blocks }),
        plain_text: plain_lines.join("\n"),
    })
}

fn inlines(text: &str, ruby_by_index: &BTreeMap<String, String>) -> Vec<Inline> {
    if text.is_empty() {
        return vec![Inline::Text { text: String::new() }];
    }
    text.split('/')
        .filter(|segment| !segment.is_empty())
        .enumerate()
        .map(
            |(index, segment)| match ruby_by_index.get(&index.to_string()).filter(|r| !r.is_empty()) {
                Some(ruby) => Inline::Ruby {
                    base: segment.to_owned(),
                    ruby: ruby.clone(),
                },
                None => Inline::Text {
                    text: segment.to_owned(),
                },
            },
        )
        .collect()
}

/// 只取正文与 ruby 的 base；空白折叠为单个空格
fn plain_text_of(children: &[Inline]) -> String {
    let joined: String = children
        .iter()
        .map(|inline| match inline {
            Inline::Text { text } => text.as_str(),
            Inline::Ruby { base, .. } => base.as_str(),
        })
        .collect();
    joined.split_whitespace().collect::<Vec<_>>().join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn line(start_ms: i64, text: &str, ruby: &[(usize, &str)]) -> LineInput {
        LineInput {
            start_ms,
            end_ms: None,
            text: text.into(),
            ruby_by_index: ruby
                .iter()
                .map(|(i, r)| (i.to_string(), (*r).to_owned()))
                .collect(),
        }
    }

    #[test]
    fn builds_ruby_and_plain_text() {
        let doc = build(
            &[
                line(10500, "君/の声が", &[(0, "きみ")]),
                line(16800, "", &[]),
                line(20000, "  世界を  変える ", &[]),
            ],
            &[Language::Ja],
        )
        .unwrap();
        assert_eq!(doc.plain_text, "君の声が\n世界を 変える");
        assert_eq!(
            doc.content["blocks"][0]["children"],
            json!([{ "type": "ruby", "base": "君", "ruby": "きみ" }, { "type": "text", "text": "の声が" }])
        );
        assert_eq!(doc.content["blocks"][0]["time"], json!({ "startMs": 10500 }));
        assert_eq!(
            doc.content["blocks"][1]["children"],
            json!([{ "type": "text", "text": "" }])
        );
        assert_eq!(doc.content["meta"]["languages"], json!(["ja"]));
    }

    #[test]
    fn rejects_newlines_inside_a_line() {
        assert!(build(&[line(0, "a\nb", &[])], &[]).is_err());
        assert!(build(&[line(0, "a\r", &[])], &[]).is_err());
        assert!(build(&[line(0, "君", &[(0, "き\nみ")])], &[]).is_err());
    }

    #[test]
    fn rejects_bad_times() {
        assert!(build(&[line(-1, "a", &[])], &[]).is_err());
        let mut bad = line(100, "a", &[]);
        bad.end_ms = Some(50);
        assert!(build(&[bad], &[]).is_err());
    }
}
