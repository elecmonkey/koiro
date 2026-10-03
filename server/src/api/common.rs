use serde::{Deserialize, Serialize};

/// 分页列表
#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(rename_all = "camelCase")]
pub struct Page<T> {
    pub items: Vec<T>,
    pub page: i64,
    pub page_size: i64,
    pub total: i64,
    pub total_pages: i64,
}

impl<T> Page<T> {
    pub fn new(items: Vec<T>, query: &PageQuery, total: i64) -> Self {
        let page_size = query.page_size();
        Self {
            items,
            page: query.page(),
            page_size,
            total,
            total_pages: (total + page_size - 1) / page_size,
        }
    }
}

/// 分页参数（查询字符串）；`page` 从 1 开始，`pageSize` 默认 20、最大 100
#[derive(Debug, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(rename_all = "camelCase")]
pub struct PageQuery {
    #[cfg_attr(test, ts(optional))]
    pub page: Option<i64>,
    #[cfg_attr(test, ts(optional))]
    pub page_size: Option<i64>,
}

impl PageQuery {
    const DEFAULT_SIZE: i64 = 20;
    const MAX_SIZE: i64 = 100;

    pub fn page(&self) -> i64 {
        self.page.unwrap_or(1).max(1)
    }

    pub fn page_size(&self) -> i64 {
        self.page_size
            .unwrap_or(Self::DEFAULT_SIZE)
            .clamp(1, Self::MAX_SIZE)
    }

    pub fn limit(&self) -> i64 {
        self.page_size()
    }

    pub fn offset(&self) -> i64 {
        (self.page() - 1) * self.page_size()
    }
}

/// 错误响应
#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
pub struct ApiError {
    pub code: ErrorCode,
    /// 可直接展示给用户的说明
    pub message: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS), ts(export, export_to = "api.ts"))]
#[serde(rename_all = "snake_case")]
pub enum ErrorCode {
    /// 请求内容不合法（400）
    BadRequest,
    /// 未登录或登录已失效（401）
    Unauthorized,
    /// 没有权限（403）
    Forbidden,
    /// 资源不存在（404）
    NotFound,
    /// 与现有数据冲突（409）
    Conflict,
    /// 请求过于频繁或服务器繁忙（429）
    TooManyRequests,
    /// 服务器内部错误（500）
    Internal,
}
