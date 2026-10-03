use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct PageQuery {
    #[serde(default = "first_page")]
    pub page: i64,
}

fn first_page() -> i64 {
    1
}

impl PageQuery {
    pub fn page(&self) -> i64 {
        self.page.max(1)
    }

    pub fn offset(&self, page_size: i64) -> i64 {
        (self.page() - 1) * page_size
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Pagination {
    pub page: i64,
    pub page_size: i64,
    pub total: i64,
    pub total_pages: i64,
}

impl Pagination {
    pub fn new(page: i64, page_size: i64, total: i64) -> Self {
        Self {
            page,
            page_size,
            total,
            total_pages: (total + page_size - 1) / page_size,
        }
    }
}

#[derive(Serialize)]
pub struct Ok {
    pub ok: bool,
}

pub const OK: Ok = Ok { ok: true };

/// 管理列表的关键字搜索参数
#[derive(Deserialize)]
pub struct SearchPageQuery {
    #[serde(default = "first_page")]
    pub page: i64,
    #[serde(default)]
    pub q: String,
}

impl SearchPageQuery {
    pub fn page(&self) -> i64 {
        self.page.max(1)
    }

    pub fn offset(&self, page_size: i64) -> i64 {
        (self.page() - 1) * page_size
    }

    /// ILIKE 模式，转义通配符
    pub fn like_pattern(&self) -> String {
        let escaped = self
            .q
            .trim()
            .replace('\\', "\\\\")
            .replace('%', "\\%")
            .replace('_', "\\_");
        format!("%{escaped}%")
    }
}
