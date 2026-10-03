//! 鉴权：JWT 只携带 `sub` + `exp`，权限从 [`UserCache`](crate::users::UserCache) 实时读取。
//!
//! handler 通过 extractor 声明访问要求，不要在 handler 里自行判断：
//! - [`Auth<P>`]：必须登录且具备权限 `P`
//! - [`CanView`]：VIEW 权限；开启匿名访问时未登录也放行
//! - [`MaybeUser`]：不做要求，只取当前用户

pub mod cli_codes;
pub mod login_limit;
mod password;
pub mod session;

use std::{marker::PhantomData, ops::Deref, sync::Arc};

use axum::{extract::FromRequestParts, http::request::Parts};

pub use password::{Hasher, hash_password};

use crate::{api::Permission, error::AppError, state::AppState, users::Account};

/// 数据库中的权限位掩码
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Permissions(i32);

impl Permissions {
    pub fn from_bits(bits: i32) -> Self {
        Self(bits)
    }

    pub fn bits(self) -> i32 {
        self.0
    }

    fn bit(permission: Permission) -> i32 {
        match permission {
            Permission::View => 1,
            Permission::Download => 2,
            Permission::Upload => 4,
            Permission::Admin => 8,
        }
    }

    pub fn contains(self, permission: Permission) -> bool {
        self.0 & Self::bit(permission) != 0
    }

    /// 没有任何权限的账号视为停用
    pub fn is_disabled(self) -> bool {
        self.0 == 0
    }

    pub fn to_list(self) -> Vec<Permission> {
        Permission::ALL
            .into_iter()
            .filter(|&permission| self.contains(permission))
            .collect()
    }

    pub fn from_list(list: &[Permission]) -> Self {
        Self(
            list.iter()
                .fold(0, |bits, &permission| bits | Self::bit(permission)),
        )
    }
}

/// handler 要求的权限
pub trait Requirement: Send + Sync + 'static {
    /// `None` 表示只要求登录（停用账号也满足）
    const PERMISSION: Option<Permission>;
}

macro_rules! requirements {
    ($($(#[$meta:meta])* $name:ident = $permission:expr),* $(,)?) => {
        $(
            $(#[$meta])*
            pub struct $name;
            impl Requirement for $name {
                const PERMISSION: Option<Permission> = $permission;
            }
        )*
    };
}

requirements! {
    /// 只要求登录
    LoggedIn = None,
    View = Some(Permission::View),
    Download = Some(Permission::Download),
    Upload = Some(Permission::Upload),
    Admin = Some(Permission::Admin),
}

/// 当前请求的用户（未登录、token 无效或用户已删除时为 `None`）
pub struct MaybeUser(pub Option<Arc<Account>>);

impl FromRequestParts<AppState> for MaybeUser {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        let Some(user_id) = session::user_id_from_headers(&parts.headers, state) else {
            return Ok(Self(None));
        };
        Ok(Self(state.users.get(user_id).await?))
    }
}

/// 必须登录且具备 `R` 要求的权限；否则 401（未登录）/ 403（权限不足）
pub struct Auth<R: Requirement> {
    pub user: Arc<Account>,
    _requirement: PhantomData<R>,
}

impl<R: Requirement> Deref for Auth<R> {
    type Target = Account;

    fn deref(&self) -> &Account {
        &self.user
    }
}

impl<R: Requirement> FromRequestParts<AppState> for Auth<R> {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        let MaybeUser(user) = MaybeUser::from_request_parts(parts, state).await?;
        let user = user.ok_or(AppError::Unauthorized("请先登录"))?;
        if R::PERMISSION.is_some_and(|permission| !user.permissions.contains(permission)) {
            return Err(AppError::Forbidden);
        }
        Ok(Self {
            user,
            _requirement: PhantomData,
        })
    }
}

/// 浏览权限。全局开启匿名访问（`KOIRO_ALLOW_ANON`）时未登录也放行，此时为 `None`；
/// 已登录但没有 VIEW 权限（如被停用）的用户始终 403。
pub struct CanView(pub Option<Arc<Account>>);

impl FromRequestParts<AppState> for CanView {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        let MaybeUser(user) = MaybeUser::from_request_parts(parts, state).await?;
        match user {
            Some(user) if user.permissions.contains(Permission::View) => Ok(Self(Some(user))),
            Some(_) => Err(AppError::Forbidden),
            None if state.config.allow_anonymous => Ok(Self(None)),
            None => Err(AppError::Unauthorized("请先登录")),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn permission_bits_round_trip() {
        let all = Permissions::from_bits(15);
        assert_eq!(
            all.to_list(),
            [
                Permission::View,
                Permission::Download,
                Permission::Upload,
                Permission::Admin
            ]
        );
        assert_eq!(Permissions::from_list(&all.to_list()), all);
        let some = Permissions::from_list(&[Permission::Upload, Permission::View, Permission::View]);
        assert_eq!(some.bits(), 5);
        assert!(Permissions::from_bits(0).is_disabled());
    }
}
