//! 鉴权：JWT 只携带 `sub` + `exp`，权限从 [`UserCache`](crate::users::UserCache) 实时读取。
//!
//! handler 通过 extractor 声明访问要求，不要在 handler 里自行判断：
//! - [`Auth<P>`]：必须登录且具备权限 `P`
//! - [`CanView`]：VIEW 权限；开启匿名访问时未登录也放行
//! - [`MaybeUser`]：不做要求，只取当前用户

pub mod cli_codes;
mod password;
pub mod session;

use std::{marker::PhantomData, ops::Deref, sync::Arc};

use axum::{extract::FromRequestParts, http::request::Parts};

pub use password::{hash_password, verify_dummy, verify_password};

use crate::{error::AppError, state::AppState, users::UserInfo};

pub trait Permission: Send + Sync + 'static {
    const BIT: i32;
}

macro_rules! permissions {
    ($($(#[$meta:meta])* $name:ident = $bit:expr),* $(,)?) => {
        $(
            $(#[$meta])*
            pub struct $name;
            impl Permission for $name {
                const BIT: i32 = $bit;
            }
        )*
    };
}

permissions! {
    /// 只要求登录（权限为 0 的停用账号也满足）
    LoggedIn = 0,
    View = 1,
    Download = 2,
    Upload = 4,
    Admin = 8,
}

pub fn has_permission(mask: i32, bit: i32) -> bool {
    mask & bit == bit
}

/// 当前请求的用户（未登录、token 无效或用户已删除时为 `None`）
pub struct MaybeUser(pub Option<Arc<UserInfo>>);

impl FromRequestParts<AppState> for MaybeUser {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        let Some(user_id) = session::user_id_from_headers(&parts.headers, state) else {
            return Ok(Self(None));
        };
        Ok(Self(state.users.get(user_id).await?))
    }
}

/// 必须登录且具备权限 `P`；否则 401（未登录）/ 403（权限不足）
pub struct Auth<P: Permission> {
    pub user: Arc<UserInfo>,
    _permission: PhantomData<P>,
}

impl<P: Permission> Deref for Auth<P> {
    type Target = UserInfo;

    fn deref(&self) -> &UserInfo {
        &self.user
    }
}

impl<P: Permission> FromRequestParts<AppState> for Auth<P> {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        let MaybeUser(user) = MaybeUser::from_request_parts(parts, state).await?;
        let user = user.ok_or(AppError::Unauthorized("Unauthorized"))?;
        if !has_permission(user.permissions, P::BIT) {
            return Err(AppError::Forbidden);
        }
        Ok(Self {
            user,
            _permission: PhantomData,
        })
    }
}

/// 浏览权限。全局开启匿名访问（`KOIRO_ALLOW_ANON`）时未登录也放行，此时为 `None`；
/// 已登录但没有 VIEW 权限（如被停用）的用户始终 403。
pub struct CanView(pub Option<Arc<UserInfo>>);

impl FromRequestParts<AppState> for CanView {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        let MaybeUser(user) = MaybeUser::from_request_parts(parts, state).await?;
        match user {
            Some(user) if has_permission(user.permissions, View::BIT) => Ok(Self(Some(user))),
            Some(_) => Err(AppError::Forbidden),
            None if state.config.allow_anonymous => Ok(Self(None)),
            None => Err(AppError::Unauthorized("Unauthorized")),
        }
    }
}
