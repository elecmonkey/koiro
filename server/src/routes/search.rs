//! 全文搜索：标题 > staff 姓名（不含角色名）> 歌词，大小写不敏感的子串匹配。
//! 用 ILIKE 式的子串匹配而不是 pg_trgm：trgm 对中日文与 1–2 字的关键词基本无效，
//! 而曲库规模下全表扫描只需毫秒级。

use std::collections::HashMap;

use axum::{Router, extract::State, routing::get};
use sqlx::types::Json as SqlJson;

use super::extract::{Json, Query};
use crate::{
    api::{
        MatchField, Page, PageQuery, SearchHit, SearchQuery, SongId, StaffCredit, StaffHighlight, TextSegment,
    },
    auth::CanView,
    error::AppResult,
    songs,
    state::AppState,
};

/// 歌词摘录在关键字前后各取的字符数
const EXCERPT_CONTEXT: usize = 15;

pub fn router() -> Router<AppState> {
    Router::new().route("/search", get(search))
}

async fn search(
    State(state): State<AppState>,
    _view: CanView,
    Query(page): Query<PageQuery>,
    Query(query): Query<SearchQuery>,
) -> AppResult<Json<Page<SearchHit>>> {
    let keyword = query.q.trim().to_lowercase();
    if keyword.is_empty() {
        return Ok(Json(Page::new(Vec::new(), &page, 0)));
    }

    let rows = sqlx::query!(
        r#"WITH scored AS (
               SELECT s.id, s.title, s.staff, s.updated_at,
                      CASE WHEN strpos(lower(s.title), $1) > 0
                           THEN 100 + CASE WHEN lower(s.title) = $1 THEN 50 ELSE 0 END
                                    + CASE WHEN starts_with(lower(s.title), $1) THEN 30 ELSE 0 END
                           ELSE 0 END AS title_score,
                      (SELECT max(CASE WHEN lower(n) = $1 THEN 75 ELSE 50 END)
                       FROM jsonb_array_elements(s.staff) x, jsonb_array_elements_text(x->'names') n
                       WHERE strpos(lower(n), $1) > 0) AS staff_score,
                      (SELECT l.plain_text FROM lyrics l
                       WHERE l.song_id = s.id AND strpos(lower(l.plain_text), $1) > 0
                       ORDER BY l.is_default DESC, l.position LIMIT 1) AS lyrics_match
               FROM songs s
           )
           SELECT id AS "id!: SongId", title AS "title!", staff AS "staff!: SqlJson<Vec<StaffCredit>>",
                  title_score > 0 AS "title_matched!", staff_score IS NOT NULL AS "staff_matched!",
                  lyrics_match, count(*) OVER () AS "total!"
           FROM scored
           WHERE title_score > 0 OR staff_score IS NOT NULL OR lyrics_match IS NOT NULL
           ORDER BY title_score + COALESCE(staff_score, 0) + CASE WHEN lyrics_match IS NULL THEN 0 ELSE 20 END DESC,
                    updated_at DESC, id
           LIMIT $2 OFFSET $3"#,
        keyword,
        page.limit(),
        page.offset()
    )
    .fetch_all(&state.pool)
    .await?;

    let total = match rows.first() {
        Some(row) => row.total,
        // 这一页为空时窗口函数拿不到总数，单独数一次
        None => count_matches(&state, &keyword).await?,
    };
    let ids: Vec<SongId> = rows.iter().map(|row| row.id).collect();
    let mut summaries: HashMap<SongId, _> = songs::summaries(&state, &ids)
        .await?
        .into_iter()
        .map(|song| (song.id, song))
        .collect();
    let hits = rows
        .into_iter()
        .filter_map(|row| {
            let song = summaries.remove(&row.id)?;
            let matched = [
                (row.title_matched, MatchField::Title),
                (row.staff_matched, MatchField::Staff),
                (row.lyrics_match.is_some(), MatchField::Lyrics),
            ]
            .into_iter()
            .filter_map(|(hit, field)| hit.then_some(field))
            .collect();
            Some(SearchHit {
                song,
                matched,
                title: highlights(&row.title, &keyword),
                staff: row
                    .staff
                    .0
                    .iter()
                    .map(|credit| StaffHighlight {
                        role: credit.role.clone(),
                        names: credit
                            .names
                            .iter()
                            .map(|name| highlights(name, &keyword))
                            .collect(),
                    })
                    .collect(),
                lyrics_excerpt: row
                    .lyrics_match
                    .as_deref()
                    .map(|text| highlights(&excerpt(text, &keyword), &keyword)),
            })
        })
        .collect();
    Ok(Json(Page::new(hits, &page, total)))
}

async fn count_matches(state: &AppState, keyword: &str) -> AppResult<i64> {
    Ok(sqlx::query_scalar!(
        r#"SELECT count(*) AS "n!" FROM songs s
           WHERE strpos(lower(s.title), $1) > 0
              OR EXISTS (SELECT 1 FROM jsonb_array_elements(s.staff) x, jsonb_array_elements_text(x->'names') n
                         WHERE strpos(lower(n), $1) > 0)
              OR EXISTS (SELECT 1 FROM lyrics l WHERE l.song_id = s.id AND strpos(lower(l.plain_text), $1) > 0)"#,
        keyword
    )
    .fetch_one(&state.pool)
    .await?)
}

/// 关键字所在的那一行，前后各取 [`EXCERPT_CONTEXT`] 个字符
fn excerpt(text: &str, keyword: &str) -> String {
    let line = text
        .lines()
        .find(|line| line.to_lowercase().contains(keyword))
        .unwrap_or(text);
    let chars: Vec<char> = line.chars().collect();
    let lower: Vec<char> = line.to_lowercase().chars().collect();
    let needle: Vec<char> = keyword.chars().collect();
    // 小写化可能改变字符数（极少见），此时退化为从头截取
    let index = if lower.len() == chars.len() {
        lower
            .windows(needle.len())
            .position(|window| window == needle.as_slice())
            .unwrap_or(0)
    } else {
        0
    };
    let start = index.saturating_sub(EXCERPT_CONTEXT);
    let end = (index + needle.len() + EXCERPT_CONTEXT).min(chars.len());
    let mut out = String::new();
    if start > 0 {
        out.push('…');
    }
    out.extend(&chars[start..end]);
    if end < chars.len() {
        out.push('…');
    }
    out
}

/// 按关键字切分为命中 / 未命中的片段（大小写不敏感）
fn highlights(text: &str, keyword: &str) -> Vec<TextSegment> {
    let chars: Vec<char> = text.chars().collect();
    let lower: Vec<char> = text.to_lowercase().chars().collect();
    let needle: Vec<char> = keyword.chars().collect();
    let plain = |text: String| TextSegment {
        text,
        highlight: false,
    };
    if needle.is_empty() || lower.len() != chars.len() {
        return vec![plain(text.to_owned())];
    }
    let mut segments = Vec::new();
    let (mut cursor, mut i) = (0, 0);
    while i + needle.len() <= lower.len() {
        if lower[i..i + needle.len()] == needle[..] {
            if i > cursor {
                segments.push(plain(chars[cursor..i].iter().collect()));
            }
            segments.push(TextSegment {
                text: chars[i..i + needle.len()].iter().collect(),
                highlight: true,
            });
            i += needle.len();
            cursor = i;
        } else {
            i += 1;
        }
    }
    if cursor < chars.len() || segments.is_empty() {
        segments.push(plain(chars[cursor..].iter().collect()));
    }
    segments
}

#[cfg(test)]
mod tests {
    use super::*;

    fn render(segments: &[TextSegment]) -> String {
        segments
            .iter()
            .map(|s| {
                if s.highlight {
                    format!("[{}]", s.text)
                } else {
                    s.text.clone()
                }
            })
            .collect()
    }

    #[test]
    fn highlights_case_insensitive() {
        assert_eq!(render(&highlights("Love me Love", "love")), "[Love] me [Love]");
        assert_eq!(render(&highlights("君の声", "声")), "君の[声]");
        assert_eq!(render(&highlights("abc", "x")), "abc");
    }

    #[test]
    fn excerpts_stay_on_the_matching_line() {
        assert_eq!(excerpt("第一行\n短歌词\n第三行", "歌"), "短歌词");
        let long = "一二三四五六七八九十一二三四五六七八九十关键一二三四五六七八九十一二三四五六七八九十";
        assert_eq!(
            excerpt(long, "关键"),
            "…六七八九十一二三四五六七八九十关键一二三四五六七八九十一二三四五…"
        );
    }
}
