use std::fmt;

use serde::{Deserialize, Serialize};
use uuid::Uuid;

macro_rules! ids {
    ($($(#[$meta:meta])* $name:ident),* $(,)?) => {
        $(
            $(#[$meta])*
            #[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize, sqlx::Type)]
            #[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
            #[sqlx(transparent)]
            pub struct $name(pub Uuid);

            impl fmt::Display for $name {
                fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                    self.0.fmt(f)
                }
            }
        )*
    };
}

ids! {
    /// 用户 ID
    UserId,
    /// 歌曲 ID
    SongId,
    /// 音频版本 ID
    AudioVersionId,
    /// 歌词 ID
    LyricsId,
    /// 歌单 ID
    PlaylistId,
}
