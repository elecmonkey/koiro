//! 接口类型：服务端与客户端（web、命令行）之间约定的数据结构。
//!
//! 这里是唯一来源。带 `#[cfg_attr(test, derive(TS))]` 的类型在 `cargo test` 时
//! 导出到 `packages/shared/src/generated/`，客户端从那里引用，不另行手写。

pub mod language;

pub use language::Language;
