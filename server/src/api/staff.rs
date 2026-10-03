use serde::Serialize;

/// 一位参与者：按姓名的精确写法聚合所有歌曲
#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(rename_all = "camelCase")]
pub struct StaffMember {
    pub name: String,
    /// 参与的歌曲数
    pub song_count: i64,
    /// 担任过的角色，按歌曲数从多到少
    pub roles: Vec<RoleCount>,
}

#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(rename_all = "camelCase")]
pub struct RoleCount {
    pub role: String,
    pub song_count: i64,
}
