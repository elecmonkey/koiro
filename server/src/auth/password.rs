//! 与旧版 Node 实现兼容的 scrypt 哈希：`scrypt:<salt>:<hex hash>`。
//! 参数取 Node `crypto.scryptSync` 默认值（N=2^14, r=8, p=1, 64 字节）；
//! salt 是 32 位 hex 字符串，按 UTF-8 字节参与计算（不做 hex 解码）。

use std::{
    sync::{Arc, LazyLock},
    time::Duration,
};

use scrypt::{Params, scrypt};
use subtle::ConstantTimeEq;
use tokio::sync::Semaphore;

use crate::error::{AppError, AppResult};

const KEY_LEN: usize = 64;

/// 每次运算约占 16 MiB 内存（128 * N * r 字节），同时最多进行这么多次
const CONCURRENT_HASHES: usize = 2;
/// 排队超过这个时间就放弃，返回 429
const QUEUE_TIMEOUT: Duration = Duration::from_secs(5);
/// 更长的输入不做哈希，直接视为错误密码
pub const MAX_PASSWORD_BYTES: usize = 1024;

fn params() -> Params {
    Params::new(14, 8, 1).expect("valid scrypt params")
}

fn derive(password: &str, salt: &str) -> [u8; KEY_LEN] {
    let mut out = [0u8; KEY_LEN];
    scrypt(password.as_bytes(), salt.as_bytes(), &params(), &mut out).expect("valid output length");
    out
}

pub fn hash_password(password: &str) -> String {
    let salt = hex::encode(rand::random::<[u8; 16]>());
    let hash = hex::encode(derive(password, &salt));
    format!("scrypt:{salt}:{hash}")
}

fn verify_password(password: &str, stored: &str) -> bool {
    let mut parts = stored.splitn(3, ':');
    let (Some("scrypt"), Some(salt), Some(hash)) = (parts.next(), parts.next(), parts.next()) else {
        return false;
    };
    let Ok(expected) = hex::decode(hash) else {
        return false;
    };
    if expected.len() != KEY_LEN {
        return false;
    }
    derive(password, salt).ct_eq(&expected).into()
}

/// 用户不存在时也做一次同等开销的校验，避免通过响应时间探测邮箱是否存在
fn verify_dummy(password: &str) {
    static DUMMY: LazyLock<String> = LazyLock::new(|| hash_password("koiro-dummy-password"));
    let _ = verify_password(password, &DUMMY);
}

/// 所有密码哈希、校验都经过这里：在阻塞线程池里运行，并限制同时进行的次数，
/// 避免大量并发登录请求耗尽内存。许可随运算一起移入阻塞任务，
/// 请求被取消时也要等运算结束才归还。
#[derive(Clone)]
pub struct Hasher {
    permits: Arc<Semaphore>,
    queue_timeout: Duration,
}

impl Default for Hasher {
    fn default() -> Self {
        Self::new(CONCURRENT_HASHES, QUEUE_TIMEOUT)
    }
}

impl Hasher {
    pub fn new(concurrency: usize, queue_timeout: Duration) -> Self {
        Self {
            permits: Arc::new(Semaphore::new(concurrency)),
            queue_timeout,
        }
    }

    async fn run<T: Send + 'static>(&self, work: impl FnOnce() -> T + Send + 'static) -> AppResult<T> {
        let permit = tokio::time::timeout(self.queue_timeout, self.permits.clone().acquire_owned())
            .await
            .map_err(|_| AppError::TooManyRequests("服务器繁忙，请稍后再试"))?
            .map_err(anyhow::Error::from)?;
        Ok(tokio::task::spawn_blocking(move || {
            let _permit = permit;
            work()
        })
        .await
        .map_err(anyhow::Error::from)?)
    }

    pub async fn hash(&self, password: String) -> AppResult<String> {
        self.run(move || hash_password(&password)).await
    }

    pub async fn verify(&self, password: String, stored: String) -> AppResult<bool> {
        if password.len() > MAX_PASSWORD_BYTES {
            return Ok(false);
        }
        self.run(move || verify_password(&password, &stored)).await
    }

    /// 登录用：用户不存在（`stored` 为 None）时也做一次同等开销的运算
    pub async fn verify_login(&self, password: String, stored: Option<String>) -> AppResult<bool> {
        if password.len() > MAX_PASSWORD_BYTES {
            return Ok(false);
        }
        self.run(move || match stored {
            Some(stored) => verify_password(&password, &stored),
            None => {
                verify_dummy(&password);
                false
            }
        })
        .await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trip() {
        let stored = hash_password("hunter2");
        assert!(verify_password("hunter2", &stored));
        assert!(!verify_password("hunter3", &stored));
    }

    #[test]
    fn verifies_node_generated_hash() {
        // node -e 'const c=require("crypto");const s="00112233445566778899aabbccddeeff";
        //   console.log(`scrypt:${s}:${c.scryptSync("koiro",s,64).toString("hex")}`)'
        let stored = include_str!("testdata/node_scrypt_hash.txt").trim();
        assert!(verify_password("koiro", stored));
        assert!(!verify_password("koiro!", stored));
    }

    #[test]
    fn rejects_malformed() {
        assert!(!verify_password("x", ""));
        assert!(!verify_password("x", "bcrypt:a:b"));
        assert!(!verify_password("x", "scrypt:salt:nothex"));
    }

    #[tokio::test]
    async fn busy_hasher_rejects_instead_of_queueing_forever() {
        let hasher = Hasher::new(1, Duration::from_millis(20));
        let _held = hasher.permits.clone().acquire_owned().await.unwrap();
        let result = hasher.verify("x".into(), "scrypt:a:b".into()).await;
        assert!(matches!(result, Err(AppError::TooManyRequests(_))));
    }

    #[tokio::test]
    async fn overlong_passwords_are_not_hashed() {
        let hasher = Hasher::new(0, Duration::from_millis(20));
        let long = "a".repeat(MAX_PASSWORD_BYTES + 1);
        assert!(!hasher.verify(long, "scrypt:a:b".into()).await.unwrap());
    }
}
