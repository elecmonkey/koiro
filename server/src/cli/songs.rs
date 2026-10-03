//! 曲库体检命令

use clap::Subcommand;
use sqlx::PgPool;

#[derive(Subcommand)]
pub enum SongCommand {
    /// 列出同名歌曲
    Duplicates,
    /// 列出默认音频版本没有绑定歌词的歌曲
    MissingLyrics,
}

pub async fn run(command: SongCommand, pool: &PgPool) -> anyhow::Result<()> {
    match command {
        SongCommand::Duplicates => duplicates(pool).await,
        SongCommand::MissingLyrics => missing_lyrics(pool).await,
    }
}

async fn duplicates(pool: &PgPool) -> anyhow::Result<()> {
    let rows = sqlx::query!(
        r#"SELECT btrim(title) AS "title!", array_agg(id ORDER BY created_at) AS "ids!"
           FROM songs GROUP BY btrim(title) HAVING count(*) > 1
           ORDER BY count(*) DESC, 1"#
    )
    .fetch_all(pool)
    .await?;
    if rows.is_empty() {
        println!("没有发现同名歌曲。");
    }
    for row in rows {
        println!("{}（{} 首）", row.title, row.ids.len());
        for id in row.ids {
            println!("  {id}");
        }
    }
    Ok(())
}

async fn missing_lyrics(pool: &PgPool) -> anyhow::Result<()> {
    let rows = sqlx::query!(
        r#"SELECT s.id, s.title, av.name AS "version?"
           FROM songs s LEFT JOIN audio_versions av ON av.song_id = s.id AND av.is_default
           WHERE av.id IS NULL OR av.lyrics_id IS NULL
           ORDER BY s.title"#
    )
    .fetch_all(pool)
    .await?;
    if rows.is_empty() {
        println!("所有默认音频版本都已绑定歌词。");
    }
    for row in rows {
        let reason = match row.version {
            Some(name) => format!("默认版本「{name}」未绑定歌词"),
            None => "没有默认音频版本".to_owned(),
        };
        println!("{}  {}  {reason}", row.id, row.title);
    }
    Ok(())
}
