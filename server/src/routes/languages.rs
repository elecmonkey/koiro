use axum::{Router, extract::State, routing::get};

use super::extract::Json;
use crate::{api::LanguageStat, auth::CanView, error::AppResult, songs::parse_language, state::AppState};

pub fn router() -> Router<AppState> {
    Router::new().route("/languages", get(list))
}

/// 歌词用到的语种及覆盖的歌曲数，从多到少。某个语种的歌曲用 `GET /songs?language=<代码>` 获取
async fn list(State(state): State<AppState>, _view: CanView) -> AppResult<Json<Vec<LanguageStat>>> {
    let rows = sqlx::query!(
        r#"SELECT lang AS "code!", count(DISTINCT l.song_id) AS "song_count!"
           FROM lyrics l, unnest(l.languages) lang
           GROUP BY lang ORDER BY 2 DESC, 1"#
    )
    .fetch_all(&state.pool)
    .await?;
    let stats = rows
        .into_iter()
        .map(|row| {
            Ok(LanguageStat {
                language: parse_language(&row.code)?,
                song_count: row.song_count,
            })
        })
        .collect::<AppResult<_>>()?;
    Ok(Json(stats))
}
