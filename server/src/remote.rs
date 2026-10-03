//! 从用户给出的 URL 拉取资源，防 SSRF：
//! - 只允许 http/https
//! - DNS 解析结果、URL 中的 IP 字面量以及每一跳重定向，都必须是公网地址
//! - 不走代理（否则 DNS 由代理解析，检查失效）
//! - 限制大小与超时

use std::{
    net::{IpAddr, Ipv4Addr, Ipv6Addr, SocketAddr},
    time::Duration,
};

use anyhow::{Context, bail};
use futures_util::StreamExt;
use reqwest::{
    Client, Url,
    dns::{Addrs, Name, Resolve, Resolving},
    redirect,
};

pub fn client() -> anyhow::Result<Client> {
    Ok(Client::builder()
        .no_proxy()
        .dns_resolver(PublicOnlyResolver)
        .redirect(redirect::Policy::custom(|attempt| {
            if attempt.previous().len() >= 3 {
                attempt.error("too many redirects")
            } else if let Err(err) = check_url(attempt.url()) {
                attempt.error(err.to_string())
            } else {
                attempt.follow()
            }
        }))
        .connect_timeout(Duration::from_secs(5))
        .timeout(Duration::from_secs(20))
        .user_agent("Koiro")
        .build()?)
}

/// 拉取并返回 (body, content-type)，超过 `max_bytes` 即中止
pub async fn fetch(
    client: &Client,
    raw_url: &str,
    max_bytes: usize,
) -> anyhow::Result<(Vec<u8>, Option<String>)> {
    let url = Url::parse(raw_url).context("无效的 URL")?;
    check_url(&url)?;

    let response = client.get(url).send().await?.error_for_status()?;
    if response
        .content_length()
        .is_some_and(|len| len > max_bytes as u64)
    {
        bail!("文件过大");
    }
    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .map(str::to_owned);

    let mut body = Vec::new();
    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk?;
        if body.len() + chunk.len() > max_bytes {
            bail!("文件过大");
        }
        body.extend_from_slice(&chunk);
    }
    Ok((body, content_type))
}

fn check_url(url: &Url) -> anyhow::Result<()> {
    if !matches!(url.scheme(), "http" | "https") {
        bail!("只支持 http/https");
    }
    // IP 字面量不经过 DNS 解析器，需要单独检查
    match url.host() {
        Some(url::Host::Ipv4(ip)) if !is_public(IpAddr::V4(ip)) => bail!("不允许访问内网地址"),
        Some(url::Host::Ipv6(ip)) if !is_public(IpAddr::V6(ip)) => bail!("不允许访问内网地址"),
        None => bail!("无效的 URL"),
        _ => Ok(()),
    }
}

struct PublicOnlyResolver;

impl Resolve for PublicOnlyResolver {
    fn resolve(&self, name: Name) -> Resolving {
        Box::pin(async move {
            let addrs: Vec<SocketAddr> = tokio::net::lookup_host((name.as_str(), 0))
                .await?
                .filter(|addr| is_public(addr.ip()))
                .collect();
            if addrs.is_empty() {
                return Err("不允许访问内网地址".into());
            }
            Ok(Box::new(addrs.into_iter()) as Addrs)
        })
    }
}

fn is_public(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(ip) => is_public_v4(ip),
        IpAddr::V6(ip) => match ip.to_ipv4_mapped() {
            Some(v4) => is_public_v4(v4),
            None => is_public_v6(ip),
        },
    }
}

fn is_public_v4(ip: Ipv4Addr) -> bool {
    let [a, b, ..] = ip.octets();
    !(ip.is_private()
        || ip.is_loopback()
        || ip.is_link_local()
        || ip.is_unspecified()
        || ip.is_broadcast()
        || ip.is_multicast()
        || ip.is_documentation()
        || a == 0
        // 100.64.0.0/10 运营商级 NAT
        || (a == 100 && (64..128).contains(&b))
        // 198.18.0.0/15 基准测试
        || (a == 198 && (b == 18 || b == 19))
        || a >= 240)
}

fn is_public_v6(ip: Ipv6Addr) -> bool {
    let first = ip.segments()[0];
    !(ip.is_loopback()
        || ip.is_unspecified()
        || ip.is_multicast()
        // fc00::/7 唯一本地地址
        || (first & 0xfe00) == 0xfc00
        // fe80::/10 链路本地
        || (first & 0xffc0) == 0xfe80
        // 2001:db8::/32 文档
        || (first == 0x2001 && ip.segments()[1] == 0x0db8))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_addresses() {
        for ip in [
            "127.0.0.1",
            "10.1.2.3",
            "172.16.0.1",
            "192.168.1.1",
            "169.254.169.254",
            "100.64.0.1",
            "0.0.0.0",
            "::1",
            "fd00::1",
            "fe80::1",
            "::ffff:127.0.0.1",
        ] {
            assert!(!is_public(ip.parse().unwrap()), "{ip} should be blocked");
        }
        for ip in ["1.1.1.1", "121.229.155.237", "2606:4700::1111"] {
            assert!(is_public(ip.parse().unwrap()), "{ip} should be allowed");
        }
    }

    #[test]
    fn rejects_bad_urls() {
        for url in [
            "file:///etc/passwd",
            "http://127.0.0.1/",
            "http://[::1]/",
            "ftp://example.com/",
        ] {
            assert!(check_url(&Url::parse(url).unwrap()).is_err(), "{url}");
        }
        assert!(check_url(&Url::parse("https://example.com/a.png").unwrap()).is_ok());
    }
}
