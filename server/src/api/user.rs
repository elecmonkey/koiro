use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use super::UserId;

/// 权限
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(rename_all = "lowercase")]
pub enum Permission {
    /// 浏览、搜索、播放
    View,
    /// 下载音频文件
    Download,
    /// 新建歌曲、上传文件
    Upload,
    /// 修改和删除歌曲、管理歌单与用户
    Admin,
}

impl Permission {
    pub const ALL: [Self; 4] = [Self::View, Self::Download, Self::Upload, Self::Admin];
}

/// 用户；`permissions` 为空表示账号已停用
#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: UserId,
    pub email: String,
    pub display_name: String,
    pub permissions: Vec<Permission>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 当前会话
#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(rename_all = "camelCase")]
pub struct Session {
    /// 未登录时为空
    pub user: Option<User>,
    /// 站点是否允许未登录浏览
    pub allow_anonymous: bool,
}

#[derive(Debug, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(rename_all = "camelCase")]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
    /// 登录有效期（天）：1、7、30 或 180
    pub ttl_days: i64,
}

/// 用户列表的筛选条件（查询字符串）
#[derive(Debug, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
pub struct UserFilter {
    /// 邮箱或昵称包含的文字
    #[cfg_attr(test, ts(optional))]
    pub q: Option<String>,
}

/// 新建用户
#[derive(Debug, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(rename_all = "camelCase")]
pub struct UserInput {
    pub email: String,
    pub display_name: String,
    pub password: String,
    pub permissions: Vec<Permission>,
}

/// 管理员修改用户；省略的字段不变
#[derive(Debug, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(rename_all = "camelCase")]
pub struct UserPatch {
    #[serde(default)]
    #[cfg_attr(test, ts(optional))]
    pub display_name: Option<String>,
    #[serde(default)]
    #[cfg_attr(test, ts(optional))]
    pub password: Option<String>,
    #[serde(default)]
    #[cfg_attr(test, ts(optional))]
    pub permissions: Option<Vec<Permission>>,
}

/// 修改自己的资料；省略的字段不变
#[derive(Debug, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(rename_all = "camelCase")]
pub struct ProfilePatch {
    #[serde(default)]
    #[cfg_attr(test, ts(optional))]
    pub display_name: Option<String>,
    #[serde(default)]
    #[cfg_attr(test, ts(optional))]
    pub password: Option<PasswordChange>,
}

#[derive(Debug, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(rename_all = "camelCase")]
pub struct PasswordChange {
    pub current: String,
    pub new: String,
}

/// 命令行登录：已登录的用户在浏览器里确认
#[derive(Debug, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(rename_all = "camelCase")]
pub struct CliAuthorizeRequest {
    /// 命令行在本机监听的 `http://127.0.0.1:<端口>/callback`
    pub redirect_uri: String,
    /// 64 位十六进制随机串，原样带回回调
    pub state: String,
    /// PKCE S256 challenge
    pub code_challenge: String,
}

#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(rename_all = "camelCase")]
pub struct CliAuthorization {
    /// 浏览器随后跳转的地址，带有一次性授权码
    pub callback_url: String,
}

/// 命令行用授权码换取登录凭据
#[derive(Debug, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(rename_all = "camelCase")]
pub struct CliExchangeRequest {
    pub code: String,
    pub code_verifier: String,
    pub redirect_uri: String,
}

/// 命令行的登录凭据，以 `Authorization: Bearer` 携带
#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(rename_all = "camelCase")]
pub struct CliToken {
    pub token: String,
    pub expires_at: DateTime<Utc>,
    pub user: User,
}
