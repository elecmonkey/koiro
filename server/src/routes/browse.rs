//! staff / 语种的聚合浏览，以及全文搜索

use std::collections::BTreeMap;

use axum::{
    Json, Router,
    extract::{Path, Query, State},
    routing::get,
};
use serde::{Deserialize, Serialize};
use sqlx::types::Json as SqlJson;
use uuid::Uuid;

use super::common::{PageQuery, Pagination};
use crate::{
    auth::CanView,
    error::{AppError, AppResult},
    media::{Cover, cover},
    songs::{self, SongSummary, StaffEntry},
    state::AppState,
};

const STAFF_PAGE_SIZE: i64 = 10;
const LANGUAGE_PAGE_SIZE: i64 = 20;
/// 词云默认只显示参与超过这个数量的 staff
const STAFF_CLOUD_THRESHOLD: i64 = 2;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/staff", get(staff_cloud))
        .route("/staff/{name}", get(staff_detail))
        .route("/languages", get(language_cloud))
        .route("/languages/{code}", get(language_detail))
        .route("/search", get(search))
}

#[derive(Serialize)]
struct RoleCount {
    role: String,
    count: i64,
}

#[derive(Serialize)]
struct StaffCloudEntry {
    name: String,
    count: i64,
    roles: Vec<RoleCount>,
}

#[derive(Serialize)]
struct StaffCloud {
    staff: Vec<StaffCloudEntry>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct StaffCloudQuery {
    #[serde(default)]
    include_singles: Option<String>,
}

/// 把 (name, role, count) 行聚合成每人的总数与按角色细分（角色为空的只计入总数）
fn group_roles(rows: Vec<(String, String, i64)>) -> BTreeMap<String, (i64, Vec<RoleCount>)> {
    let mut grouped: BTreeMap<String, (i64, Vec<RoleCount>)> = BTreeMap::new();
    for (name, role, count) in rows {
        let entry = grouped.entry(name).or_default();
        entry.0 += count;
        if !role.is_empty() {
            entry.1.push(RoleCount { role, count });
        }
    }
    for (_, roles) in grouped.values_mut() {
        roles.sort_by(|a, b| b.count.cmp(&a.count).then_with(|| a.role.cmp(&b.role)));
    }
    grouped
}

async fn staff_cloud(
    State(state): State<AppState>,
    _view: CanView,
    Query(query): Query<StaffCloudQuery>,
) -> AppResult<Json<StaffCloud>> {
    let include_singles = query.include_singles.as_deref() == Some("1");
    let rows = sqlx::query!(
        r#"SELECT btrim(n) AS "name!", btrim(x->>'role') AS "role!", count(*) AS "count!"
           FROM songs s, jsonb_array_elements(s.staff) x, jsonb_array_elements_text(x->'name') n
           WHERE btrim(n) <> ''
           GROUP BY 1, 2"#
    )
    .fetch_all(&state.pool)
    .await?;
    let mut staff: Vec<StaffCloudEntry> =
        group_roles(rows.into_iter().map(|r| (r.name, r.role, r.count)).collect())
            .into_iter()
            .filter(|(_, (count, _))| include_singles || *count > STAFF_CLOUD_THRESHOLD)
            .map(|(name, (count, roles))| StaffCloudEntry { name, count, roles })
            .collect();
    staff.sort_by(|a, b| b.count.cmp(&a.count).then_with(|| a.name.cmp(&b.name)));
    Ok(Json(StaffCloud { staff }))
}

#[derive(Serialize)]
struct StaffInfo {
    name: String,
    total: i64,
    roles: Vec<RoleCount>,
}

#[derive(Serialize)]
struct StaffDetail {
    staff: StaffInfo,
    songs: Vec<SongSummary>,
    pagination: Pagination,
}

async fn staff_detail(
    State(state): State<AppState>,
    _view: CanView,
    Path(name): Path<String>,
    Query(query): Query<PageQuery>,
) -> AppResult<Json<StaffDetail>> {
    let name = name.trim().to_owned();
    let role_rows = sqlx::query!(
        r#"SELECT btrim(x->>'role') AS "role!", count(*) AS "count!"
           FROM songs s, jsonb_array_elements(s.staff) x, jsonb_array_elements_text(x->'name') n
           WHERE btrim(n) = $1
           GROUP BY 1"#,
        name
    )
    .fetch_all(&state.pool)
    .await?;
    if role_rows.is_empty() {
        return Err(AppError::NotFound);
    }
    let total = sqlx::query_scalar!(
        r#"SELECT count(*) AS "n!" FROM songs s
           WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(s.staff) x, jsonb_array_elements_text(x->'name') n
                         WHERE btrim(n) = $1)"#,
        name
    )
    .fetch_one(&state.pool)
    .await?;
    let ids = sqlx::query_scalar!(
        r#"SELECT s.id FROM songs s
           WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(s.staff) x, jsonb_array_elements_text(x->'name') n
                         WHERE btrim(n) = $1)
           ORDER BY s.updated_at DESC, s.id LIMIT $2 OFFSET $3"#,
        name,
        STAFF_PAGE_SIZE,
        query.offset(STAFF_PAGE_SIZE)
    )
    .fetch_all(&state.pool)
    .await?;

    let roles = group_roles(
        role_rows
            .into_iter()
            .map(|r| (name.clone(), r.role, r.count))
            .collect(),
    )
    .remove(&name)
    .map(|(_, roles)| roles)
    .unwrap_or_default();
    Ok(Json(StaffDetail {
        staff: StaffInfo { name, total, roles },
        songs: songs::summaries(&state, &ids).await?,
        pagination: Pagination::new(query.page(), STAFF_PAGE_SIZE, total),
    }))
}

#[derive(Serialize)]
struct LanguageCount {
    language: String,
    count: i64,
}

#[derive(Serialize)]
struct LanguageCloud {
    languages: Vec<LanguageCount>,
}

/// 每个语种覆盖的歌曲数（一首歌任一歌词版本标注了该语种即计入）
async fn language_cloud(State(state): State<AppState>, _view: CanView) -> AppResult<Json<LanguageCloud>> {
    let languages = sqlx::query_as!(
        LanguageCount,
        r#"SELECT lang AS "language!", count(DISTINCT l.song_id) AS "count!"
           FROM lyrics_documents l, jsonb_array_elements_text(l.content->'meta'->'languages') lang
           WHERE lang <> ''
           GROUP BY lang ORDER BY 2 DESC, 1"#
    )
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(LanguageCloud { languages }))
}

#[derive(Serialize)]
struct LanguageInfo {
    code: String,
    total: i64,
}

#[derive(Serialize)]
struct LanguageDetail {
    language: LanguageInfo,
    songs: Vec<SongSummary>,
    pagination: Pagination,
}

async fn language_detail(
    State(state): State<AppState>,
    _view: CanView,
    Path(code): Path<String>,
    Query(query): Query<PageQuery>,
) -> AppResult<Json<LanguageDetail>> {
    let total = sqlx::query_scalar!(
        r#"SELECT count(*) AS "n!" FROM songs s
           WHERE EXISTS (SELECT 1 FROM lyrics_documents l
                         WHERE l.song_id = s.id AND l.content->'meta'->'languages' ? $1)"#,
        code
    )
    .fetch_one(&state.pool)
    .await?;
    let ids = sqlx::query_scalar!(
        r#"SELECT s.id FROM songs s
           WHERE EXISTS (SELECT 1 FROM lyrics_documents l
                         WHERE l.song_id = s.id AND l.content->'meta'->'languages' ? $1)
           ORDER BY s.updated_at DESC, s.id LIMIT $2 OFFSET $3"#,
        code,
        LANGUAGE_PAGE_SIZE,
        query.offset(LANGUAGE_PAGE_SIZE)
    )
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(LanguageDetail {
        language: LanguageInfo { code, total },
        songs: songs::summaries(&state, &ids).await?,
        pagination: Pagination::new(query.page(), LANGUAGE_PAGE_SIZE, total),
    }))
}

// ---------------------------------------------------------------- 搜索

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SearchQuery {
    #[serde(default)]
    q: String,
    #[serde(default = "default_page")]
    page: i64,
    #[serde(default = "default_search_page_size")]
    page_size: i64,
}

fn default_page() -> i64 {
    1
}

fn default_search_page_size() -> i64 {
    20
}

#[derive(Serialize)]
struct Segment {
    text: String,
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    highlight: bool,
}

#[derive(Serialize)]
struct StaffHighlight {
    role: String,
    name: Vec<Segment>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SearchResult {
    id: Uuid,
    title: String,
    description: String,
    staff: Vec<StaffEntry>,
    cover: Option<Cover>,
    score: i32,
    match_type: Vec<&'static str>,
    match_snippet: Option<String>,
    title_highlights: Vec<Segment>,
    staff_highlights: Vec<StaffHighlight>,
    match_snippet_highlights: Option<Vec<Segment>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SearchResponse {
    results: Vec<SearchResult>,
    total: i64,
    page: i64,
    page_size: i64,
    total_pages: i64,
}

/// 标题 > staff 姓名（不含角色名）> 歌词，大小写不敏感的子串匹配。
/// 用 ILIKE 而不是 pg_trgm：trgm 对中日文与 1–2 字的关键词基本无效，而曲库规模下全表扫描只需毫秒级。
async fn search(
    State(state): State<AppState>,
    _view: CanView,
    Query(query): Query<SearchQuery>,
) -> AppResult<Json<SearchResponse>> {
    let keyword = query.q.trim().to_lowercase();
    let page = query.page.max(1);
    let page_size = query.page_size.clamp(1, 50);
    if keyword.is_empty() {
        return Ok(Json(SearchResponse {
            results: Vec::new(),
            total: 0,
            page,
            page_size,
            total_pages: 0,
        }));
    }

    let rows = sqlx::query!(
        r#"WITH scored AS (
               SELECT s.id, s.title, s.description, s.cover_object_id, s.updated_at,
                      s.staff AS staff,
                      CASE WHEN strpos(lower(s.title), $1) > 0
                           THEN 100 + CASE WHEN lower(s.title) = $1 THEN 50 ELSE 0 END
                                    + CASE WHEN starts_with(lower(s.title), $1) THEN 30 ELSE 0 END
                           ELSE 0 END AS title_score,
                      (SELECT max(CASE WHEN lower(btrim(n)) = $1 THEN 75 ELSE 50 END)
                       FROM jsonb_array_elements(s.staff) x, jsonb_array_elements_text(x->'name') n
                       WHERE strpos(lower(n), $1) > 0) AS staff_score,
                      (SELECT l.plain_text FROM lyrics_documents l
                       WHERE l.song_id = s.id AND strpos(lower(l.plain_text), $1) > 0
                       ORDER BY l.is_default DESC, l.created_at LIMIT 1) AS lyrics_match
               FROM songs s
           )
           SELECT id AS "id!", title AS "title!", description AS "description!", cover_object_id,
                  staff AS "staff!: SqlJson<Vec<StaffEntry>>",
                  title_score AS "title_score!", staff_score, lyrics_match,
                  (title_score + COALESCE(staff_score, 0) + CASE WHEN lyrics_match IS NULL THEN 0 ELSE 20 END) AS "score!",
                  count(*) OVER () AS "total!"
           FROM scored
           WHERE title_score > 0 OR staff_score IS NOT NULL OR lyrics_match IS NOT NULL
           ORDER BY 9 DESC, updated_at DESC, id
           LIMIT $2 OFFSET $3"#,
        keyword,
        page_size,
        (page - 1) * page_size
    )
    .fetch_all(&state.pool)
    .await?;

    let total = rows.first().map_or(0, |r| r.total);
    let results = rows
        .into_iter()
        .map(|row| {
            let staff = row.staff.0;
            let mut match_type = Vec::new();
            if row.title_score > 0 {
                match_type.push("title");
            }
            // staff 命中优先作为摘要，其次是歌词片段
            let staff_snippet = staff.iter().find_map(|item| {
                item.name
                    .iter()
                    .find(|n| n.to_lowercase().contains(&keyword))
                    .map(|n| format!("{}: {n}", item.role))
            });
            if row.staff_score.is_some() {
                match_type.push("staff");
            }
            if row.lyrics_match.is_some() {
                match_type.push("lyrics");
            }
            let match_snippet =
                staff_snippet.or_else(|| row.lyrics_match.as_deref().map(|t| snippet(t, &keyword)));
            SearchResult {
                id: row.id,
                title_highlights: highlights(&row.title, &keyword),
                title: row.title,
                description: row.description,
                staff_highlights: staff
                    .iter()
                    .map(|item| StaffHighlight {
                        role: item.role.clone(),
                        name: highlights(&item.name.join("、"), &keyword),
                    })
                    .collect(),
                staff,
                cover: cover(&state, row.cover_object_id.as_deref()),
                score: row.score,
                match_type,
                match_snippet_highlights: match_snippet.as_deref().map(|s| highlights(s, &keyword)),
                match_snippet,
            }
        })
        .collect();

    Ok(Json(SearchResponse {
        results,
        total,
        page,
        page_size,
        total_pages: (total + page_size - 1) / page_size,
    }))
}

/// 关键字前后各取 15 个字符
fn snippet(text: &str, keyword: &str) -> String {
    let chars: Vec<char> = text.chars().collect();
    let lower: Vec<char> = text.to_lowercase().chars().collect();
    let needle: Vec<char> = keyword.chars().collect();
    // 小写化可能改变字符数（极少见），此时退化为从头截取
    let index = if lower.len() == chars.len() {
        lower
            .windows(needle.len())
            .position(|w| w == needle.as_slice())
            .unwrap_or(0)
    } else {
        0
    };
    let start = index.saturating_sub(15);
    let end = (index + needle.len() + 15).min(chars.len());
    let mut out = String::new();
    if start > 0 {
        out.push_str("...");
    }
    out.extend(&chars[start..end]);
    if end < chars.len() {
        out.push_str("...");
    }
    out
}

/// 按关键字切分为高亮 / 非高亮片段（大小写不敏感）
fn highlights(text: &str, keyword: &str) -> Vec<Segment> {
    let chars: Vec<char> = text.chars().collect();
    let lower: Vec<char> = text.to_lowercase().chars().collect();
    let needle: Vec<char> = keyword.chars().collect();
    if needle.is_empty() || lower.len() != chars.len() {
        return vec![Segment {
            text: text.to_owned(),
            highlight: false,
        }];
    }
    let mut segments = Vec::new();
    let (mut cursor, mut i) = (0, 0);
    while i + needle.len() <= lower.len() {
        if lower[i..i + needle.len()] == needle[..] {
            if i > cursor {
                segments.push(Segment {
                    text: chars[cursor..i].iter().collect(),
                    highlight: false,
                });
            }
            segments.push(Segment {
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
        segments.push(Segment {
            text: chars[cursor..].iter().collect(),
            highlight: false,
        });
    }
    segments
}

#[cfg(test)]
mod tests {
    use super::*;

    fn render(segments: &[Segment]) -> String {
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
    fn snippets() {
        assert_eq!(snippet("短歌词", "歌"), "短歌词");
        let long = "一二三四五六七八九十一二三四五六七八九十关键一二三四五六七八九十一二三四五六七八九十";
        assert_eq!(
            snippet(long, "关键"),
            "...六七八九十一二三四五六七八九十关键一二三四五六七八九十一二三四五..."
        );
    }
}
