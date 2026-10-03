//! 登录尝试计数：按来源 IP 计，窗口期内失败过多时直接拒绝，不再查库、不再做密码哈希。
//! 不按邮箱计数：那样任何人都能故意输错密码，把别人的账号锁住。
//! 计数只在进程内存里，重启即清空。

use std::{
    net::{IpAddr, Ipv6Addr, SocketAddr},
    time::Duration,
};

use axum::http::HeaderMap;
use moka::future::Cache;

use crate::error::{AppError, AppResult};

/// 最后一次尝试后经过这么久，计数清零
const WINDOW: Duration = Duration::from_secs(15 * 60);
const MAX_FAILURES_PER_IP: u32 = 20;
const CAPACITY: u64 = 10_000;

#[derive(Clone)]
pub struct LoginLimiter {
    attempts: Cache<String, u32>,
}

impl Default for LoginLimiter {
    fn default() -> Self {
        Self {
            attempts: Cache::builder()
                .max_capacity(CAPACITY)
                .time_to_live(WINDOW)
                .build(),
        }
    }
}

/// IPv6 按 /64 计数：同一网段里换地址不能绕过限制
fn ip_key(ip: IpAddr) -> String {
    match ip {
        IpAddr::V4(v4) => format!("ip:{v4}"),
        IpAddr::V6(v6) => match v6.to_ipv4_mapped() {
            Some(v4) => format!("ip:{v4}"),
            None => {
                let s = v6.segments();
                format!("ip:{}/64", Ipv6Addr::new(s[0], s[1], s[2], s[3], 0, 0, 0, 0))
            }
        },
    }
}

impl LoginLimiter {
    /// 开始一次登录：先计数再校验密码，同一 IP 的并发请求也逃不过上限
    pub async fn begin(&self, ip: IpAddr) -> AppResult<()> {
        let count = self
            .attempts
            .entry(ip_key(ip))
            .and_upsert_with(|entry| async move { entry.map_or(1, |e| e.into_value().saturating_add(1)) })
            .await
            .into_value();
        if count > MAX_FAILURES_PER_IP {
            return Err(AppError::TooManyRequests("登录失败次数过多，请 15 分钟后再试"));
        }
        Ok(())
    }

    /// 登录成功：这次尝试不算失败
    pub async fn succeeded(&self, ip: IpAddr) {
        self.attempts
            .entry(ip_key(ip))
            .and_upsert_with(|entry| async move { entry.map_or(0, |e| e.into_value().saturating_sub(1)) })
            .await;
    }
}

/// 客户端地址：服务只监听本机，由本机反向代理转发时取 `X-Forwarded-For` 的最后一项
/// （代理追加的、它实际看到的地址）；直接连接时用对端地址
pub fn client_ip(peer: SocketAddr, headers: &HeaderMap) -> IpAddr {
    if peer.ip().is_loopback()
        && let Some(ip) = headers
            .get_all("x-forwarded-for")
            .iter()
            .filter_map(|value| value.to_str().ok())
            .flat_map(|value| value.split(','))
            .next_back()
            .and_then(|value| value.trim().parse().ok())
    {
        return ip;
    }
    peer.ip()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ip(value: &str) -> IpAddr {
        value.parse().unwrap()
    }

    #[tokio::test]
    async fn blocks_an_address_after_too_many_failures_without_affecting_others() {
        let limiter = LoginLimiter::default();
        let attacker = ip("203.0.113.7");
        for _ in 0..MAX_FAILURES_PER_IP {
            limiter.begin(attacker).await.unwrap();
        }
        assert!(limiter.begin(attacker).await.is_err());
        // 同一 /64 里换地址也一样
        let v6 = ip("2001:db8::1");
        for _ in 0..MAX_FAILURES_PER_IP {
            limiter.begin(v6).await.unwrap();
        }
        assert!(limiter.begin(ip("2001:db8::2")).await.is_err());
        // 其他来源不受影响
        assert!(limiter.begin(ip("198.51.100.1")).await.is_ok());
    }

    #[tokio::test]
    async fn successful_logins_do_not_count() {
        let limiter = LoginLimiter::default();
        let user = ip("198.51.100.2");
        for _ in 0..MAX_FAILURES_PER_IP * 2 {
            limiter.begin(user).await.unwrap();
            limiter.succeeded(user).await;
        }
        assert!(limiter.begin(user).await.is_ok());
    }

    #[test]
    fn ipv6_addresses_share_their_64_prefix() {
        assert_eq!(ip_key(ip("2001:db8:1:2::1")), ip_key(ip("2001:db8:1:2:ffff::9")));
        assert_ne!(ip_key(ip("2001:db8:1:2::1")), ip_key(ip("2001:db8:1:3::1")));
        assert_eq!(ip_key(ip("::ffff:192.0.2.1")), ip_key(ip("192.0.2.1")));
    }

    #[test]
    fn forwarded_address_is_trusted_only_from_the_local_proxy() {
        let mut headers = HeaderMap::new();
        headers.insert("x-forwarded-for", "10.0.0.1, 203.0.113.9".parse().unwrap());
        let proxy: SocketAddr = "127.0.0.1:40000".parse().unwrap();
        let remote: SocketAddr = "198.51.100.5:40000".parse().unwrap();
        assert_eq!(client_ip(proxy, &headers), ip("203.0.113.9"));
        assert_eq!(client_ip(remote, &headers), ip("198.51.100.5"));
        assert_eq!(client_ip(proxy, &HeaderMap::new()), ip("127.0.0.1"));
    }
}
