use axum::{
    Json,
    extract::rejection::{JsonRejection, PathRejection, QueryRejection},
    http::StatusCode,
    response::{IntoResponse, Response},
};

use crate::api::{ApiError, ErrorCode};

/// 所有 handler 的统一错误类型，响应体为 [`ApiError`]
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("{0}")]
    BadRequest(String),
    #[error("{0}")]
    Unauthorized(&'static str),
    #[error("没有权限")]
    Forbidden,
    #[error("不存在")]
    NotFound,
    #[error("{0}")]
    Conflict(String),
    #[error("{0}")]
    TooManyRequests(&'static str),
    #[error(transparent)]
    Internal(#[from] anyhow::Error),
}

pub type AppResult<T> = Result<T, AppError>;

impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        Self::Internal(err.into())
    }
}

// 请求体、查询参数、路径参数解析失败时也返回统一的错误体
impl From<JsonRejection> for AppError {
    fn from(rejection: JsonRejection) -> Self {
        Self::BadRequest(rejection.body_text())
    }
}

impl From<QueryRejection> for AppError {
    fn from(rejection: QueryRejection) -> Self {
        Self::BadRequest(rejection.body_text())
    }
}

impl From<PathRejection> for AppError {
    fn from(rejection: PathRejection) -> Self {
        Self::BadRequest(rejection.body_text())
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code) = match &self {
            Self::BadRequest(_) => (StatusCode::BAD_REQUEST, ErrorCode::BadRequest),
            Self::Unauthorized(_) => (StatusCode::UNAUTHORIZED, ErrorCode::Unauthorized),
            Self::Forbidden => (StatusCode::FORBIDDEN, ErrorCode::Forbidden),
            Self::NotFound => (StatusCode::NOT_FOUND, ErrorCode::NotFound),
            Self::Conflict(_) => (StatusCode::CONFLICT, ErrorCode::Conflict),
            Self::TooManyRequests(_) => (StatusCode::TOO_MANY_REQUESTS, ErrorCode::TooManyRequests),
            Self::Internal(err) => {
                tracing::error!("internal error: {err:#}");
                (StatusCode::INTERNAL_SERVER_ERROR, ErrorCode::Internal)
            }
        };
        let message = match &self {
            Self::Internal(_) => "服务器内部错误".to_owned(),
            other => other.to_string(),
        };
        (status, Json(ApiError { code, message })).into_response()
    }
}
