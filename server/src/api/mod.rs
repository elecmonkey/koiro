//! 接口契约：服务端与客户端（web、命令行）之间交换的全部数据结构。
//!
//! 这里是唯一来源。每个类型在 `cargo test` 时由 ts-rs 导出到
//! `packages/shared/src/generated/api.ts`，客户端从那里引用，不另行手写。
//! 约定：
//! - 字段一律 camelCase；可空字段序列化为 `null`，不省略
//! - 可省略的字段（`?`）只出现在查询参数，以及 PATCH 请求体里表示「不修改」
//! - 列表分页统一为 [`Page`]；删除等无返回内容的操作响应 204
//! - 出错时响应体为 [`ApiError`]

mod common;
mod id;
mod language;
mod lyrics;
mod playlist;
mod search;
mod song;
mod staff;
mod upload;
mod user;

pub use common::*;
pub use id::*;
pub use language::*;
pub use lyrics::*;
pub use playlist::*;
pub use search::*;
pub use song::*;
pub use staff::*;
pub use upload::*;
pub use user::*;
