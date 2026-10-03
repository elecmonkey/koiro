use std::collections::BTreeMap;

use axum::{Router, extract::State, routing::get};

use super::extract::{Json, Path};
use crate::{
    api::{RoleCount, StaffMember},
    auth::CanView,
    error::{AppError, AppResult},
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/staff", get(list))
        .route("/staff/{name}", get(detail))
}

/// 每人参与的歌曲数，以及按角色细分（同一首歌里担任多个角色时各计一次）。
/// `name` 为空时统计所有人。
async fn members(state: &AppState, name: Option<&str>) -> AppResult<Vec<StaffMember>> {
    let rows = sqlx::query!(
        r#"SELECT n AS "name!", x->>'role' AS role, GROUPING(x->>'role') = 1 AS "is_total!",
                  count(DISTINCT s.id) AS "song_count!"
           FROM songs s, jsonb_array_elements(s.staff) x, jsonb_array_elements_text(x->'names') n
           WHERE $1::text IS NULL OR n = $1
           GROUP BY GROUPING SETS ((n), (n, x->>'role'))"#,
        name
    )
    .fetch_all(&state.pool)
    .await?;

    let mut by_name: BTreeMap<String, StaffMember> = BTreeMap::new();
    for row in rows {
        let member = by_name.entry(row.name.clone()).or_insert_with(|| StaffMember {
            name: row.name,
            song_count: 0,
            roles: Vec::new(),
        });
        if row.is_total {
            member.song_count = row.song_count;
        } else {
            member.roles.push(RoleCount {
                role: row.role.unwrap_or_default(),
                song_count: row.song_count,
            });
        }
    }
    let mut members: Vec<StaffMember> = by_name.into_values().collect();
    for member in &mut members {
        member
            .roles
            .sort_by(|a, b| b.song_count.cmp(&a.song_count).then_with(|| a.role.cmp(&b.role)));
    }
    members.sort_by(|a, b| b.song_count.cmp(&a.song_count).then_with(|| a.name.cmp(&b.name)));
    Ok(members)
}

/// 所有参与者，按参与的歌曲数从多到少
async fn list(State(state): State<AppState>, _view: CanView) -> AppResult<Json<Vec<StaffMember>>> {
    Ok(Json(members(&state, None).await?))
}

/// 一位参与者；姓名精确匹配。他参与的歌曲用 `GET /songs?staff=<姓名>` 获取
async fn detail(
    State(state): State<AppState>,
    _view: CanView,
    Path(name): Path<String>,
) -> AppResult<Json<StaffMember>> {
    let member = members(&state, Some(&name))
        .await?
        .pop()
        .ok_or(AppError::NotFound)?;
    Ok(Json(member))
}
